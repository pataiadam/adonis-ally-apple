"use strict";
/*
|--------------------------------------------------------------------------
| Apple Ally Oauth driver
|--------------------------------------------------------------------------
|
| This is a Ally Oauth Driver for Apple
|
*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppleDriver = void 0;
const standalone_1 = require("@adonisjs/ally/build/standalone");
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Apple Driver implementation
 */
class AppleDriver extends standalone_1.Oauth2Driver {
    constructor(ctx, config) {
        super(ctx, config);
        this.config = config;
        /**
         * The URL for the redirect request. The user will be redirected on this page
         * to authorize the request.
         */
        this.authorizeUrl = 'https://appleid.apple.com/auth/authorize';
        /**
         * The URL to hit to exchange the authorization code for the access token
         */
        this.accessTokenUrl = 'https://appleid.apple.com/auth/token';
        /**
         * JWKS Client, it is used in Apple key verification process
         */
        this.jwksClient = null;
        /**
         * The param name for the authorization code. Read the documentation of your oauth
         * provider and update the param name to match the query string field name in
         * which the oauth provider sends the authorization_code post redirect.
         */
        this.codeParamName = 'code';
        /**
         * The param name for the error. Read the documentation of your oauth provider and update
         * the param name to match the query string field name in which the oauth provider sends
         * the error post redirect
         */
        this.errorParamName = 'error';
        /**
         * Cookie name for storing the CSRF token. Make sure it is always unique. So a better
         * approach is to prefix the oauth provider name to `oauth_state` value. For example:
         * For example: "facebook_oauth_state"
         */
        this.stateCookieName = 'apple_oauth_state';
        /**
         * Parameter name to be used for sending and receiving the state from.
         * Read the documentation of your oauth provider and update the param
         * name to match the query string used by the provider for exchanging
         * the state.
         */
        this.stateParamName = 'state';
        /**
         * Parameter name for sending the scopes to the oauth provider.
         */
        this.scopeParamName = 'scope';
        /**
         * The separator indentifier for defining multiple scopes
         */
        this.scopesSeparator = ' ';
        /**
         * Initiate JWKS client
         */
        this.jwksClient = (0, jwks_rsa_1.default)({
            rateLimit: true,
            cache: true,
            cacheMaxEntries: 100,
            cacheMaxAge: 1000 * 60 * 60 * 24,
            jwksUri: 'https://appleid.apple.com/auth/keys',
        });
        /**
         * Extremely important to call the following method to clear the
         * state set by the redirect request.
         */
        this.loadState();
    }
    /**
     * Optionally configure the authorization redirect request. The actual request
     * is made by the base implementation of "Oauth2" driver and this is a
     * hook to pre-configure the request.
     */
    configureRedirectRequest(request) {
        /**
         * Define user defined scopes or the default one's
         */
        request.scopes(this.config.scopes || ['email']);
        request.param('client_id', this.config.clientId);
        request.param('response_type', 'code');
        request.param('response_mode', 'form_post');
        request.param('grant_type', 'authorization_code');
    }
    /**
     * Update the implementation to tell if the error received during redirect
     * means "ACCESS DENIED".
     */
    accessDenied() {
        return this.ctx.request.input('error') === 'user_denied';
    }
    /**
     * Get Apple Signning Keys to verify token
     * @param token an id_token receoived from Apple
     * @returns signing key
     */
    async getAppleSigningKey(token) {
        const decodedToken = jsonwebtoken_1.default.decode(token, { complete: true });
        const key = await this.jwksClient?.getSigningKey(decodedToken?.header.kid);
        return key?.publicKey || key?.rsaPublicKey;
    }
    /**
     * Generates Client Secret
     * https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens
     * @returns clientSecret
     */
    generateClientSecret() {
        const clientSecret = jsonwebtoken_1.default.sign({}, this.config.clientSecret, {
            algorithm: 'ES256',
            keyid: this.config.clientId,
            issuer: this.config.teamId,
            audience: 'https://appleid.apple.com',
            subject: this.config.appId,
            expiresIn: 60,
            header: { alg: 'ES256', kid: this.config.clientId },
        });
        return clientSecret;
    }
    /**
     * Parses user info from the Apple Token
     */
    async getUserInfo(token) {
        const signingKey = await this.getAppleSigningKey(token);
        const decodedUser = jsonwebtoken_1.default.verify(token, signingKey, {
            issuer: 'https://appleid.apple.com',
            // TODO: check if audience is correct
            // audience: this.config.appId,
        });
        const firstName = decodedUser?.user?.name?.firstName || '';
        const lastName = decodedUser?.user?.name?.lastName || '';
        return {
            id: decodedUser.sub,
            avatarUrl: null,
            original: null,
            nickName: decodedUser.sub,
            name: `${firstName}${lastName ? ` ${lastName}` : ''}`,
            email: decodedUser.email,
            emailVerificationState: decodedUser.email_verified === 'true' ? 'verified' : 'unverified',
        };
    }
    /**
     * Get access token
     */
    async accessToken(callback) {
        /**
         * We expect the user to handle errors before calling this method
         */
        if (this.hasError()) {
            throw standalone_1.OauthException.missingAuthorizationCode(this.codeParamName);
        }
        /**
         * We expect the user to properly handle the state mis-match use case before
         * calling this method
         */
        if (this.stateMisMatch()) {
            throw standalone_1.OauthException.stateMisMatch();
        }
        return this.getAccessToken((request) => {
            request.header('Content-Type', 'application/x-www-form-urlencoded');
            request.field('client_id', this.config.clientId);
            request.field('client_secret', this.generateClientSecret());
            request.field(this.codeParamName, this.getCode());
            if (typeof callback === 'function') {
                callback(request);
            }
        });
    }
    /**
     * Returns details for the authorized user
     */
    async user(callback) {
        const token = await this.accessToken(callback);
        const user = await this.getUserInfo(token.id_token);
        return {
            ...user,
            token,
        };
    }
    /**
     * Finds the user by the access token
     */
    async userFromToken(token) {
        const user = await this.getUserInfo(token);
        return {
            ...user,
            token: { token, type: 'bearer' },
        };
    }
}
exports.AppleDriver = AppleDriver;

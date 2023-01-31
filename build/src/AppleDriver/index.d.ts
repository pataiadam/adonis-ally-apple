/// <reference types="@adonisjs/ally" />
/// <reference types="@adonisjs/http-server/build/adonis-typings" />
import type { AllyUserContract, ApiRequestContract, LiteralStringUnion, RedirectRequestContract } from '@ioc:Adonis/Addons/Ally';
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { Oauth2Driver } from '@adonisjs/ally/build/standalone';
import { JwksClient } from 'jwks-rsa';
import { DateTime } from 'luxon';
/**
 * Shape of Apple Access Token
 */
export declare type AppleAccessToken = {
    token: string;
    type: string;
    id_token: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt: DateTime;
};
/**
 * Allowed Apple Sign In scopes
 */
export declare type AppleScopes = 'email' | 'string';
/**
 * Shape of the user returned from Apple
 */
export interface AppleUserContract extends Omit<AllyUserContract<AppleAccessToken>, 'token'> {
}
/**
 * Shape of the Apple decoded token
 * https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js/incorporating_sign_in_with_apple_into_other_platforms
 */
export declare type AppleTokenDecoded = {
    iss: string;
    aud: string;
    exp: number;
    iat: number;
    sub: string;
    at_hash: string;
    email: string;
    email_verified: 'true' | 'false';
    user?: {
        email?: string;
        name?: {
            firstName: string;
            lastName: string;
        };
    };
    is_private_email: boolean;
    auth_time: number;
    nonce_supported: boolean;
};
/**
 * Options available for Apple
 * @param appId App ID of your app
 * @param teamId Team ID of your Apple Developer Account
 * @param clientId Key ID, received from https://developer.apple.com/account/resources/authkeys/list
 * @param clientSecret Private key, downloaded from https://developer.apple.com/account/resources/authkeys/list
 */
export declare type AppleDriverConfig = {
    driver: 'apple';
    appId: string;
    teamId: string;
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    scopes?: LiteralStringUnion<AppleScopes>[];
};
/**
 * Apple Driver implementation
 */
export declare class AppleDriver extends Oauth2Driver<AppleAccessToken, AppleScopes> {
    config: AppleDriverConfig;
    /**
     * The URL for the redirect request. The user will be redirected on this page
     * to authorize the request.
     */
    protected authorizeUrl: string;
    /**
     * The URL to hit to exchange the authorization code for the access token
     */
    protected accessTokenUrl: string;
    /**
     * JWKS Client, it is used in Apple key verification process
     */
    protected jwksClient: JwksClient | null;
    /**
     * The param name for the authorization code. Read the documentation of your oauth
     * provider and update the param name to match the query string field name in
     * which the oauth provider sends the authorization_code post redirect.
     */
    protected codeParamName: string;
    /**
     * The param name for the error. Read the documentation of your oauth provider and update
     * the param name to match the query string field name in which the oauth provider sends
     * the error post redirect
     */
    protected errorParamName: string;
    /**
     * Cookie name for storing the CSRF token. Make sure it is always unique. So a better
     * approach is to prefix the oauth provider name to `oauth_state` value. For example:
     * For example: "facebook_oauth_state"
     */
    protected stateCookieName: string;
    /**
     * Parameter name to be used for sending and receiving the state from.
     * Read the documentation of your oauth provider and update the param
     * name to match the query string used by the provider for exchanging
     * the state.
     */
    protected stateParamName: string;
    /**
     * Parameter name for sending the scopes to the oauth provider.
     */
    protected scopeParamName: string;
    /**
     * The separator indentifier for defining multiple scopes
     */
    protected scopesSeparator: string;
    constructor(ctx: HttpContextContract, config: AppleDriverConfig);
    /**
     * Optionally configure the authorization redirect request. The actual request
     * is made by the base implementation of "Oauth2" driver and this is a
     * hook to pre-configure the request.
     */
    protected configureRedirectRequest(request: RedirectRequestContract<AppleScopes>): void;
    /**
     * Update the implementation to tell if the error received during redirect
     * means "ACCESS DENIED".
     */
    accessDenied(): boolean;
    /**
     * Get Apple Signning Keys to verify token
     * @param token an id_token receoived from Apple
     * @returns signing key
     */
    protected getAppleSigningKey(token: any): Promise<string>;
    /**
     * Generates Client Secret
     * https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens
     * @returns clientSecret
     */
    protected generateClientSecret(): string;
    /**
     * Parses user info from the Apple Token
     */
    protected getUserInfo(token: string): Promise<AppleUserContract>;
    /**
     * Get access token
     */
    accessToken(callback?: (request: ApiRequestContract) => void): Promise<AppleAccessToken>;
    /**
     * Returns details for the authorized user
     */
    user(callback?: (request: ApiRequestContract) => void): Promise<{
        token: AppleAccessToken;
        name: string;
        email: string | null;
        id: string;
        nickName: string;
        emailVerificationState: "verified" | "unverified" | "unsupported";
        avatarUrl: string | null;
        original: any;
    }>;
    /**
     * Finds the user by the access token
     */
    userFromToken(token: string): Promise<{
        token: {
            token: string;
            type: "bearer";
        };
        name: string;
        email: string | null;
        id: string;
        nickName: string;
        emailVerificationState: "verified" | "unverified" | "unsupported";
        avatarUrl: string | null;
        original: any;
    }>;
}

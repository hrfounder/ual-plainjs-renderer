"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UALJs = void 0;
const universal_authenticator_library_1 = require("universal-authenticator-library");
const UALJsDom_1 = require("./UALJsDom");
/**
 * Plain JS implementation for UAL Interaction with UI
 */
class UALJs extends universal_authenticator_library_1.UAL {
    /**
     *
     * @param userCallbackHandler Called with the array of users after a successful authenticator selection
     * @param chains Array of Chains the application wants to support
     * @param appName Name of the application
     * @param authenticators List of authenticators this app supports
     * @param renderConfig Optional UI rendering configuration for environments not using login
     */
    constructor(userCallbackHandler, chains, appName, authenticators, renderConfig) {
        super(chains, appName, authenticators);
        this.isAutologin = false;
        this.accountNameInputValue = "";
        if (renderConfig) {
            this.renderConfig = renderConfig;
        }
        this.userCallbackHandler = userCallbackHandler;
        this.loginUser = this.loginUser.bind(this);
    }
    /**
     * Initializes UAL: If a renderConfig was provided and no autologin authenticator
     * is returned it will render the Auth Button and relevant DOM elements.
     *
     */
    init() {
        const authenticators = this.getAuthenticators();
        // perform this check first, if we're autologging in we don't render a dom
        setTimeout(() => {
            if (!!authenticators.autoLoginAuthenticator) {
                this.isAutologin = true;
                this.loginUser(authenticators.autoLoginAuthenticator);
                this.activeAuthenticator = authenticators.autoLoginAuthenticator;
            }
            else {
                // check for existing session and resume if possible
                this.attemptSessionLogin(authenticators.availableAuthenticators);
                if (!this.renderConfig) {
                    throw new Error("Render Configuration is required when no auto login authenticator is provided");
                }
                const { containerElement, buttonStyleOverride = false } = this
                    .renderConfig;
                this.dom = new UALJsDom_1.UALJsDom(this.loginUser, authenticators.availableAuthenticators, containerElement, buttonStyleOverride);
                this.dom.generateUIDom();
            }
        }, 500);
    }
    /**
     * Attempts to resume a users session if they previously logged in
     *
     * @param authenticators Available authenticators for login
     */
    attemptSessionLogin(authenticators) {
        const sessionExpiration = localStorage.getItem(UALJs.SESSION_EXPIRATION_KEY) || null;
        if (sessionExpiration) {
            // clear session if it has expired and continue
            if (new Date(sessionExpiration) <= new Date()) {
                localStorage.clear();
            }
            else {
                const authenticatorName = localStorage.getItem(UALJs.SESSION_AUTHENTICATOR_KEY);
                const sessionAuthenticator = authenticators.find((authenticator) => authenticator.constructor.name === authenticatorName);
                const accountName = localStorage.getItem(UALJs.SESSION_ACCOUNT_NAME_KEY) || undefined;
                this.loginUser(sessionAuthenticator, accountName);
            }
        }
    }
    /**
     * App developer can call this directly with the preferred authenticator or render a
     * UI to let the user select their authenticator
     *
     * @param authenticator Authenticator chosen for login
     * @param accountName Account name (optional) of the user logging in
     */
    loginUser(authenticator, accountName) {
        return __awaiter(this, void 0, void 0, function* () {
            let users;
            // set the active authenticator so we can use it in logout
            this.activeAuthenticator = authenticator;
            const invalidateSeconds = this.activeAuthenticator.shouldInvalidateAfter();
            const invalidateAt = new Date();
            invalidateAt.setSeconds(invalidateAt.getSeconds() + invalidateSeconds);
            localStorage.setItem(UALJs.SESSION_EXPIRATION_KEY, invalidateAt.toString());
            localStorage.setItem(UALJs.SESSION_AUTHENTICATOR_KEY, authenticator.constructor.name);
            try {
                yield this.waitForAuthenticatorToLoad(authenticator);
                if (accountName) {
                    users = yield authenticator.login(accountName);
                    localStorage.setItem(UALJs.SESSION_ACCOUNT_NAME_KEY, accountName);
                }
                else {
                    users = yield authenticator.login();
                }
                // send our users back
                this.userCallbackHandler(users);
            }
            catch (e) {
                console.error("Error", e);
                console.error("Error cause", e.cause ? e.cause : "");
                this.clearStorageKeys();
                throw e;
            }
            // reset our modal state if we're not autologged in (no dom is rendered for autologin)
            if (!this.isAutologin) {
                this.dom.reset();
            }
        });
    }
    waitForAuthenticatorToLoad(authenticator) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                if (!authenticator.isLoading()) {
                    resolve();
                    return;
                }
                const authenticatorIsLoadingCheck = setInterval(() => {
                    if (!authenticator.isLoading()) {
                        clearInterval(authenticatorIsLoadingCheck);
                        resolve();
                    }
                }, UALJs.AUTHENTICATOR_LOADING_INTERVAL);
            });
        });
    }
    /**
     * Clears the session data for the logged in user
     */
    logoutUser() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.activeAuthenticator) {
                throw Error("No active authenticator defined, did you login before attempting to logout?");
            }
            this.activeAuthenticator.logout();
            this.clearStorageKeys();
        });
    }
    clearStorageKeys() {
        // clear out our storage keys
        localStorage.removeItem(UALJs.SESSION_EXPIRATION_KEY);
        localStorage.removeItem(UALJs.SESSION_AUTHENTICATOR_KEY);
        localStorage.removeItem(UALJs.SESSION_ACCOUNT_NAME_KEY);
    }
}
exports.UALJs = UALJs;
UALJs.SESSION_EXPIRATION_KEY = "ual-session-expiration";
UALJs.SESSION_AUTHENTICATOR_KEY = "ual-session-authenticator";
UALJs.SESSION_ACCOUNT_NAME_KEY = "ual-session-account-name";
UALJs.AUTHENTICATOR_LOADING_INTERVAL = 250;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVUFMSnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvVUFMSnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEscUZBS3lDO0FBQ3pDLHlDQUFzQztBQVV0Qzs7R0FFRztBQUNILE1BQWEsS0FBTSxTQUFRLHFDQUFHO0lBZ0I1Qjs7Ozs7OztPQU9HO0lBQ0gsWUFDRSxtQkFBMkMsRUFDM0MsTUFBZSxFQUNmLE9BQWUsRUFDZixjQUErQixFQUMvQixZQUFnQztRQUVoQyxLQUFLLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQztRQTlCbEMsZ0JBQVcsR0FBWSxLQUFLLENBQUM7UUFTMUIsMEJBQXFCLEdBQVcsRUFBRSxDQUFDO1FBdUIzQyxJQUFJLFlBQVksRUFBRTtZQUNoQixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztTQUNsQztRQUVELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxtQkFBbUIsQ0FBQztRQUUvQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0ksSUFBSTtRQUNULE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ2hELDBFQUEwRTtRQUMxRSxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2QsSUFBSSxDQUFDLENBQUMsY0FBYyxDQUFDLHNCQUFzQixFQUFFO2dCQUMzQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztnQkFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQztnQkFDdEQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQzthQUNsRTtpQkFBTTtnQkFDTCxvREFBb0Q7Z0JBQ3BELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLENB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
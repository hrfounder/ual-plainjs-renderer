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
                const sessionAuthenticator = authenticators.find((authenticator) => authenticator.getName() === authenticatorName);
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
            localStorage.setItem(UALJs.SESSION_AUTHENTICATOR_KEY, authenticator.getName());
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
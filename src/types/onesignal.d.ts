export {};

declare global {
  interface OneSignalApi {
    // Core identity APIs used by the app
    login?: (externalId: string) => Promise<void>;
    logout?: () => Promise<void>;
    User?: {
      addTags?: (tags: Record<string, string>) => Promise<void>;
    };

    // UI prompt helper (web SDK)
    Slidedown?: {
      promptPush?: () => void;
    };

    // Click handling
    Notifications?: {
      addEventListener?: (
        event: 'click',
        handler: (event: { notification: { data?: Record<string, string> } }) => void,
      ) => void;
    };
  }

  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalApi) => void | Promise<void>>;
    __oneSignalInitOk?: boolean;
  }
}


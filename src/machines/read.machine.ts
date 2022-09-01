import { createMachine, assign } from "xstate";
import { useMachine } from "@xstate/react";

import * as React from "react";

//

declare global {
  interface Window {
    // eslint-disable-next-line
    v3d: any;
  }
}

type OnSceneLoadedCallback = (app: any) => void;

type VergeSettings = {
  enabled: boolean;
};
type VergeAssetData = {
  assetsPath: string;
  gltfAssetName: string;
  containerId: string;
};

type ReadEvent = { type: "TOGGLE_VERGE" } | { type: "INIT" };

type ReadContext = {
  vergeSettings: VergeSettings | undefined;
  vergeAssetData: VergeAssetData;
  onSceneLoaded: OnSceneLoadedCallback;
};

const readMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QCUwEMIAICyaDGAFgJYB2YAdAMqXKYDCBYeA1gMSKgAOA9rEQC5FuJDiAAeiAMySALOQCcAJnkBGFaoAMADgCsilQHYANCACeiRQDZylnVskGZMy4oN6VigL6eTqDDnxiMnIASRIBdiQQHj5BYVEJBEl9ckUNRR1JO0tJFRkVHJNzBFd5chlJDUsq0q0tdW9fdCxcQlIKADUwACcYTABREjQAIwAbSFYAFQB5AHFZgBl+gH0O-uRZ-tEYgSERKMSPDUlUqvkDAw0LmXOZIsRnFXIs6oN5WR1tLRlGkD8WwLtchdXpgTAAESIsBG4wgUzmixWaw2WyiOzi+1Ahw0OjkOhUWU+zgyBgc9xKGnIKi0yl0Wnel3xBks3h8IBI3AgcFE-wCbWC1FoDCYzG2vF28QOiEMOnIGiqTh01Rk3w8inJWXIukuBUsBi0tkUih+bN5rSCFDCAjFsT2CQskms8lUOmdlgJysk5JUOgMCi+GXkSu+knsvzNgOCIL6gxhkBtEsx4kQ8ks1gMHhUVSuruqXrMiAAtOoTtTFI6CekLh4tOHmnyLcCen1IdCxvG0eKMfaEPq-Ro8td9VlKjpyfk-Y46p9bFoM9I6-5ze0E92pQgfU95ZZFcrVUbyYWrLKy47ZIZ7DIvKygA */
  createMachine(
    {
      tsTypes: {} as import("./read.machine.typegen").Typegen0,
      schema: { events: {} as ReadEvent, context: {} as ReadContext },
      preserveActionOrder: true,
      id: "Read Machine",
      initial: "Idle",
      states: {
        Idle: {
          always: {
            target: "Init",
            cond: "vergeSDKLoaded",
          },
          on: {
            INIT: {
              target: "Init",
            },
          },
        },
        Init: {
          entry: "setVergeEnabledFromLocalSettings",
          always: [
            {
              cond: "vergeEnabled",
              target: "Verge Enabled",
            },
            {
              target: "Verge Disabled",
            },
          ],
        },
        "Verge Enabled": {
          invoke: {
            src: "vergeApp",
            id: "vergeApp",
          },
          on: {
            TOGGLE_VERGE: {
              actions: ["disableVerge", "updateLocalSettings"],
              target: "Verge Disabled",
            },
          },
        },
        "Verge Disabled": {
          on: {
            TOGGLE_VERGE: {
              actions: ["enableVerge", "updateLocalSettings"],

              target: "Verge Enabled",
            },
          },
        },
      },
    },
    {
      actions: {
        enableVerge: assign((c, _e) => {
          return {
            vergeSettings: {
              ...c.vergeSettings,
              enabled: true,
            },
          };
        }),
        disableVerge: assign((c, _e) => {
          return {
            vergeSettings: {
              ...c.vergeSettings,
              enabled: false,
            },
          };
        }),
        updateLocalSettings: (c, _e) => {
          saveVergeSettingsToLocalStorage(c.vergeSettings);
        },
        setVergeEnabledFromLocalSettings: assign((_c, _e) => {
          const vergeSettings = getVergeSettingsFromLocalStorageWithFallback();

          return {
            vergeSettings,
          };
        }),
      },
      guards: {
        vergeSDKLoaded: () => {
          return (
            typeof window !== "undefined" && typeof window.v3d !== "undefined"
          );
        },
        vergeEnabled: (c) => {
          return c.vergeSettings?.enabled ?? false;
        },
      },
      services: {
        vergeApp: (c) => () => {
          let hasUnmounted = false;
          // eslint-disable-next-line
          let app: any;

          const assetsPathTrimmed = c.vergeAssetData.assetsPath.replace(
            /\/$/,
            ""
          );
          const gltfAsset = c.vergeAssetData.gltfAssetName;

          const logicUrl = `${assetsPathTrimmed}/visual_logic.js`;
          const sceneUrl = `${assetsPathTrimmed}/${gltfAsset}`;

          new window.v3d.PuzzlesLoader().loadLogic(logicUrl, () => {
            if (hasUnmounted) return;

            const { initOptions, contextSettings } = initSettings(
              c.vergeAssetData
            );
            const preloader = getPreloader(c.vergeAssetData);

            app = new window.v3d.App(
              c.vergeAssetData.containerId,
              contextSettings,
              preloader
            );
            prepareApp(app, initOptions);
            app.loadScene(
              sceneUrl,
              () => {
                if (hasUnmounted) {
                  app.dispose();
                  return;
                }

                finaliseApp(app, initOptions);
                c.onSceneLoaded?.(app);
              },
              null,
              () => {
                console.log(`Can't load the scene: ${sceneUrl}`);
              }
            );
          });

          return () => {
            hasUnmounted = true;
            app?.dispose();
          };
        },
      },
    }
  );

////////////////////////////////
// *** *** *** *** *** *** ***//
//        VERGE METHODS       //
// *** *** *** *** *** *** ***//
////////////////////////////////

/* eslint-disable @typescript-eslint/no-explicit-any */
function initSettings({ containerId }: VergeAssetData): {
  initOptions: Record<string, any>;
  contextSettings: Record<string, any>;
} {
  const initOptions = window.v3d.PL
    ? window.v3d.PL.execInitPuzzles({
        container: containerId,
      }).initOptions
    : { useFullscreen: true };

  const ctxSettings: Record<string, any> = {};
  if (initOptions.useBkgTransp) ctxSettings.alpha = true;
  if (initOptions.preserveDrawBuf) ctxSettings.preserveDrawingBuffer = true;

  return { initOptions, contextSettings: ctxSettings };
}

function getPreloader({ containerId }: VergeAssetData) {
  const preloader = new window.v3d.SimplePreloader({
    container: containerId,
  });

  if (window.v3d.PE) {
    const _onUpdate = preloader.onUpdate.bind(preloader);
    preloader.onUpdate = function (percentage: any) {
      _onUpdate(percentage);
      window.v3d.PE.loadingUpdateCb(percentage);
    };

    const _onFinish = preloader.onFinish.bind(preloader);
    preloader.onFinish = function () {
      _onFinish();
      window.v3d.PE.loadingFinishCb();
    };
  }

  return preloader;
}

function prepareApp(app: any, initOptions: Record<string, any>) {
  if (initOptions.useBkgTransp) {
    app.clearBkgOnLoad = true;
    app.renderer.setClearColor(0x000000, 0);
  }

  app.ExternalInterface = {};
  prepareExternalInterface(app);
}

function finaliseApp(app: any, initOptions: Record<string, any>) {
  app.enableControls();
  app.run();

  if (window.v3d.PE) window.v3d.PE.updateAppInstance(app);
  if (window.v3d.PL) window.v3d.PL.init(app, initOptions);
}

//eslint-disable-next-line
function prepareExternalInterface(_app: any) {
  // register functions in the app.ExternalInterface to call them from Puzzles, e.g:
  // app.ExternalInterface.myJSFunction = function() {
  //     console.log('Hello, World!');
  // }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

////////////////////////////////
// *** *** *** *** *** *** ***//
//       HELPER METHODS       //
// *** *** *** *** *** *** ***//
////////////////////////////////

const VERGE_SETTINGS_LOCALSTORAGE_KEY = "tempus::verge_settings";

const saveVergeSettingsToLocalStorage = (
  _settings: VergeSettings | undefined
) => {};

const getVergeSettingsFromLocalStorageWithFallback = (): VergeSettings => {
  return {
    enabled: true,
  };
};

////////////////////////////////
// *** *** *** *** *** *** ***//
//        MACHINE HOOK        //
// *** *** *** *** *** *** ***//
////////////////////////////////

export const useReadMachine = ({
  assetsPath,
  gltfAssetName,
  containerId,
  onSceneLoaded,
}: VergeAssetData & {
  onSceneLoaded?: OnSceneLoadedCallback;
}) => {
  const [state, send, service] = useMachine(readMachine, {
    context: {
      onSceneLoaded,
      vergeAssetData: {
        assetsPath,
        gltfAssetName,
        containerId,
      },
    },
  });

  if (process.env.NODE_ENV === "development") {
    // We can disable conditional hooks error, because it will always be called in dev
    // mode, and never called when built and deployed
    // eslint-disable-next-line
    React.useEffect(() => {
      const subscription = service.subscribe((state) =>
        console.log("Read", state)
      );

      return () => subscription.unsubscribe();

      // service is a stable reference
      // eslint-disable-next-line
    }, []);
  }

  return {
    vergeSettings: state.context.vergeSettings,
    toggleVerge: () => send({ type: "TOGGLE_VERGE" }),
    init: () => send({ type: "INIT" }),
    isIdle: state.matches("Idle"),
  };
};

import { invoke } from "@tauri-apps/api/core";
import "./global.css";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
} from "solid-js";
import { webviewWindow } from "@tauri-apps/api";
import Fuse, { FuseResultMatch } from "fuse.js";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

const App = () => {
  let unlisten: UnlistenFn;

  const [query, setQuery] = createSignal<string>("");
  const [suggestions, setSuggestions] = createSignal<
    { item: string; matches: FuseResultMatch[] | undefined }[]
  >([]);

  const [appNames, setAppNames] = createSignal<string[]>([]);
  const [appPaths, setAppPaths] = createSignal<string[]>([]);

  const [selectedItem, setSelectedItem] = createSignal<number>(0);
  const itemRefs: { [key: number]: HTMLDivElement } = {};

  let inputRef: HTMLInputElement | undefined;

  let fuse: Fuse<string>;

  const fetchApplications = async () => {
    try {
      const apps = await invoke<string[]>("list_applications");
      const sortedApps = apps.sort((a: any, b: any) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      );

      setAppNames(sortedApps.map((app: any) => app.name));
      setAppPaths(sortedApps.map((app: any) => app.path));

      fuse = new Fuse(appNames(), {
        threshold: 0.4,
        includeMatches: true,
      });

      resetSuggestions();
    } catch (e) {
      console.error("Error fetching applications:", e);
    }
  };

  const resetSuggestions = () => {
    setSuggestions(
      appNames()
        .map((item) => ({ item, matches: undefined }))
        .sort((a, b) =>
          a.item.toLowerCase().localeCompare(b.item.toLowerCase()),
        ),
    );
  };

  const openApplication = (app: string) => {
    const appIndex = appNames().indexOf(app);
    if (appIndex !== -1) {
      const selectedApp = appPaths()[appIndex];
      invoke("open_application", { path: selectedApp });
      invoke("hide_window");
    }
  };

  const handleArrowKeyPress = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      setSelectedItem((prev) => {
        const next = prev + 1;
        if (next < suggestions().length) {
          return next;
        }
        return prev;
      });
    } else if (event.key === "ArrowUp") {
      setSelectedItem((prev) => {
        const next = prev - 1;
        if (next >= 0) {
          return next;
        }
        return prev;
      });
    }
  };

  const handleEnterKeyPress = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      const app = suggestions()[selectedItem()];
      openApplication(app.item);
    }
  };

  document.addEventListener("keydown", handleArrowKeyPress);
  document.addEventListener("keydown", handleEnterKeyPress);

  onMount(async () => {
    fetchApplications();
    inputRef?.focus();

    unlisten = await listen("update-apps", () => {
      fetchApplications();
    });
  });

  onCleanup(() => {
    unlisten?.();
  });

  createEffect(() => {
    itemRefs[selectedItem()]?.scrollIntoView({
      block: "nearest",
    });
  }, [selectedItem()]);

  const handleInput = (e: any) => {
    setQuery(e.currentTarget.value);
  };

  createMemo(() => {
    const search = query().toLowerCase().trim();

    if (search) {
      const result = fuse.search(search);
      setSuggestions(
        result.map((res) => ({
          item: res.item,
          matches: [...(res.matches || [])],
        })),
      );
    } else {
      resetSuggestions();
    }

    if (selectedItem() > suggestions().length - 1) {
      setSelectedItem(0);
    }
  });

  webviewWindow.getCurrentWebviewWindow().onFocusChanged(async (focused) => {
    if (focused.event === "tauri://blur") {
      webviewWindow.getCurrentWebviewWindow().hide();
    } else if (focused.event === "tauri://focus") {
      inputRef?.focus();

      setQuery("");
      setSelectedItem(0);
      resetSuggestions();

      const resultsContainer = document.querySelector(
        ".results-container-wrapper",
      );
      if (resultsContainer) {
        resultsContainer.scrollTop = 0;
      }
    }
  });

  return (
    <div class="search-container overflow-hidden h-screen w-screen max-h-screen min-h-screen flex flex-col rounded-b-xl">
      <input
        ref={inputRef}
        class="w-full text-fg bg-bg focus:outline-none focus:border-none min-h-12 h-12 max-h-12 py-2 text-xl align-middle inline-block rounded-t-xl"
        style={{
          "padding-left": `calc(0.5rem + 10px)`,
          "padding-right": `calc(0.5rem + 10px)`,
        }}
        onInput={handleInput}
        value={query()}
      ></input>
      <div class="results-container-wrapper overflow-auto bg-bg flex-grow pb-[10px]">
        <div class="results-container overflow-none bg-bg flex-grow">
          <For each={suggestions().map((item) => item.item)}>
            {(appName: string, index) => (
              <div
                ref={(el) => (itemRefs[index()] = el)}
                class={`${index() === selectedItem() ? "bg-fg text-bg" : "hover:bg-hover bg-bg text-fg"} flex flex-row items-center justify-between rounded-xl h-12 max-h-12`}
                style={{
                  width: `calc(100% - 20px)`,
                  "margin-left": "10px",
                  "margin-right": "10px",
                }}
                onClick={() => {
                  setSelectedItem(index());
                  openApplication(appName);
                }}
              >
                <div class="p-2 text-xl select-none">{appName}</div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};

export default App;

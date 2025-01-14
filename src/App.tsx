import { invoke } from "@tauri-apps/api/core";
import "./global.css";
import { createSignal, For, onMount } from "solid-js";
import { webviewWindow } from "@tauri-apps/api";

const App = () => {
  const [query, setQuery] = createSignal<string>("");
  const [suggestions, setSuggestions] = createSignal<string[]>([]);

  const [appNames, setAppNames] = createSignal<string[]>([]);
  const [appPaths, setAppPaths] = createSignal<string[]>([]);

  const [selectedItem, setSelectedItem] = createSignal<number>(0);
  const itemRefs: { [key: number]: HTMLDivElement } = {};

  const fetchApplications = async () => {
    try {
      const apps = await invoke<string[]>("list_applications");
      const sortedApps = apps.sort((a: any, b: any) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      );

      setAppNames(sortedApps.map((app: any) => app.name));
      setAppPaths(sortedApps.map((app: any) => app.path));

      setSuggestions(appNames());

      console.log(appNames(), appPaths());
    } catch (e) {
      console.error("Error fetching applications:", e);
    }
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
        if (next < appNames().length) {
          itemRefs[next]?.scrollIntoView({ block: "nearest" });
          return next;
        }
        return prev;
      });
    } else if (event.key === "ArrowUp") {
      setSelectedItem((prev) => {
        const next = prev - 1;
        if (next >= 0) {
          itemRefs[next]?.scrollIntoView({ block: "nearest" });
          return next;
        }
        return prev;
      });
    }
  };

  const handleEnterKeyPress = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      const app = suggestions()[selectedItem()];
      openApplication(app);
    }
  };

  document.addEventListener("keydown", handleArrowKeyPress);
  document.addEventListener("keydown", handleEnterKeyPress);

  onMount(() => {
    fetchApplications();
  });

  const handleInput = (e: any) => {
    setQuery(e.currentTarget.value);

    setSuggestions(
      appNames().filter((appName: string) =>
        appName.toLowerCase().includes(query().toLowerCase()),
      ),
    );
  };

  webviewWindow.getCurrentWebviewWindow().onFocusChanged(async (focused) => {
    console.log(focused);
    if (focused.event === "tauri://blur") {
      webviewWindow.getCurrentWebviewWindow().hide();
    }
  });

  return (
    <div class="search-container overflow-hidden h-screen w-screen flex flex-col rounded-b-xl">
      <input
        class="w-full text-fg bg-bg focus:outline-none focus:border-none min-h-12 h-12 max-h-12 py-2 text-xl align-middle inline-block rounded-t-xl"
        style={{
          "padding-left": `calc(0.5rem + 10px)`,
          "padding-right": `calc(0.5rem + 10px)`,
        }}
        onInput={handleInput}
      ></input>
      <div class="results-container overflow-auto bg-bg flex-grow">
        <For each={suggestions()}>
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
  );
};

export default App;

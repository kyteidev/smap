import { invoke } from "@tauri-apps/api/core";
import "./global.css";
import { createSignal, For, onMount } from "solid-js";

const App = () => {
  const [appNames, setAppNames] = createSignal<string[]>([]);
  const [appPaths, setAppPaths] = createSignal<string[]>([]);

  const [selectedItem, setSelectedItem] = createSignal<number>(0);

  const fetchApplications = async () => {
    try {
      const apps = await invoke<string[]>("list_applications");
      setAppNames(apps.map((app: any) => app.name));
      setAppPaths(apps.map((app: any) => app.path));
    } catch (e) {
      console.error("Error fetching applications:", e);
    }
  };

  const openApplication = () => {
    const selectedApp = appPaths()[selectedItem()];
    invoke("open_application", { path: selectedApp });
  };

  const handleArrowKeyPress = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      setSelectedItem((prev) => prev + 1);
    } else if (event.key === "ArrowUp") {
      setSelectedItem((prev) => prev - 1);
    }
  };

  const handleEnterKeyPress = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      openApplication();
    }
  };

  document.addEventListener("keydown", handleArrowKeyPress);
  document.addEventListener("keydown", handleEnterKeyPress);

  onMount(() => {
    fetchApplications();
  });

  return (
    <div class="search-container overflow-hidden h-screen w-screen flex flex-col rounded-b-xl">
      <input
        class="w-full text-fg bg-bg focus:outline-none focus:border-none min-h-12 h-12 max-h-12 py-2 text-xl align-middle inline-block rounded-t-xl"
        style={{
          "padding-left": `calc(0.5rem + 10px)`,
          "padding-right": `calc(0.5rem + 10px)`,
        }}
      ></input>
      <div class="results-container overflow-auto bg-bg flex-grow">
        <For each={appNames()}>
          {(appName: string, index) => (
            <div
              class={`${index() === selectedItem() ? "bg-fg text-bg" : "hover:bg-hover bg-bg text-fg"} flex flex-row items-center justify-between rounded-xl h-12 max-h-12`}
              style={{
                width: `calc(100% - 20px)`,
                "margin-left": "10px",
                "margin-right": "10px",
              }}
              onClick={() => {
                setSelectedItem(index());
                openApplication();
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

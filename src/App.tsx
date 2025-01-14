import { invoke } from "@tauri-apps/api/core";
import "./global.css";
import { createSignal, For, onMount } from "solid-js";

const App = () => {
  const [appNames, setAppNames] = createSignal<string[]>([]);
  const [appPaths, setAppPaths] = createSignal<string[]>([]);

  const fetchApplications = async () => {
    try {
      const apps = await invoke<string[]>("list_applications");
      setAppNames(apps.map((app: any) => app.name));
      setAppPaths(apps.map((app: any) => app.path));
    } catch (e) {
      console.error("Error fetching applications:", e);
    }
  };

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
          {(appName: string) => (
            <div
              class="flex flex-row justify-between items-center hover:bg-hover bg-bg rounded-xl h-12 max-h-12"
              style={{
                width: `calc(100% - 20px)`,
                "margin-left": "10px",
                "margin-right": "10px",
              }}
            >
              <div class="p-2 text-xl text-fg">{appName}</div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default App;

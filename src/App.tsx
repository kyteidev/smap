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
    <div class="search-container overflow-hidden">
      <input class="w-screen text-fg bg-bg p-2 focus:outline-none focus:border-none h-12 text-3xl align-middle inline-block rounded-t-xl"></input>
      <div class="results-container overflow-auto">
        <For each={appNames()}>
          {(appName: string) => (
            <div class="flex flex-row justify-between items-center bg-bg w-full h-12">
              <div class="ml-2 text-xl text-fg">{appName}</div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default App;

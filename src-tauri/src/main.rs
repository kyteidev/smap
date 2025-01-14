// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use tauri_plugin_cli::CliExt;

use std::{path::PathBuf, process::Command};

#[derive(Serialize, Debug)]
struct AppInfo {
    name: String,
    path: String,
}

#[tauri::command]
fn open_application(path: PathBuf) {
    println!("Opening application at path: {:?}", path);
    Command::new("open")
        .args(&["-a", path.to_str().unwrap()])
        .spawn()
        .unwrap();
}

#[tauri::command]
fn list_applications() -> Result<Vec<AppInfo>, String> {
    println!("Finding applications...");
    let output = Command::new("mdfind")
        .arg("kMDItemContentType==\"com.apple.application-bundle\"")
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        println!("Found applications");
        let apps = String::from_utf8(output.stdout).map_err(|e| e.to_string())?;
        let app_paths: Vec<&str> = apps
            .split('\n')
            .filter(|app| {
                !app.is_empty()
                    && (
                        // Filter for common application directories
                        app.starts_with("/Applications/")
                            || app.starts_with("/System/Applications/")
                            || app.starts_with(&format!(
                                "{}/Applications/",
                                std::env::var("HOME").unwrap_or_default()
                            ))
                    )
            })
            .collect();
        let mut app_infos = Vec::new();

        println!("Obtaining app metadata...");
        for app_path in app_paths {
            let name_output = Command::new("mdls")
                .args(&["-name", "kMDItemDisplayName", "-raw", app_path])
                .output()
                .map_err(|e| e.to_string())?;

            let name = String::from_utf8(name_output.stdout)
                .unwrap_or_else(|_| "Unknown".into())
                .trim()
                .to_string();

            app_infos.push(AppInfo {
                name,
                path: app_path.into(),
            });
        }

        Ok(app_infos)
    } else {
        Err("Failed to list applications".into())
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .setup(|app| {
            match app.cli().matches() {
                Ok(matches) => {
                    println!("{:?}", matches)
                }
                Err(_) => {}
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_applications,
            open_application
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use tauri::menu::Menu;
use tauri::Manager;
use tauri::{menu::MenuItem, tray::TrayIconBuilder};
use tauri_plugin_cli::CliExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use std::{path::PathBuf, process::Command};

#[derive(Serialize, Debug)]
struct AppInfo {
    name: String,
    path: String,
}

#[tauri::command]
fn show_window(window: tauri::Window) {
    window.show().unwrap();
    window.set_focus().unwrap();
}

#[tauri::command]
fn hide_window(window: tauri::Window) {
    window.hide().unwrap();
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
    let mut app = tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .setup(|app| {
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .build(app)?;

            match app.cli().matches() {
                Ok(matches) => {
                    println!("{:?}", matches)
                }
                Err(_) => {}
            }

            let shortcut_keys = Shortcut::new(Some(Modifiers::SUPER), Code::Space);
            let app_handle = app.handle().clone();

            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |_app, shortcut, event| {
                        println!("{:?}", shortcut);
                        if shortcut == &shortcut_keys {
                            match event.state() {
                                ShortcutState::Pressed => {
                                    if let Some(window) = app_handle.get_webview_window("main") {
                                        if window.is_visible().unwrap() {
                                            window.hide().unwrap();
                                        } else {
                                            window.show().unwrap();
                                            window.set_focus().unwrap();
                                        }
                                    }
                                }
                                ShortcutState::Released => {}
                            }
                        }
                    })
                    .build(),
            )?;

            app.global_shortcut().register(shortcut_keys)?;

            Ok(())
        })
        .on_menu_event(|app, e| match e.id.as_ref() {
            "quit" => {
                println!("Quitting app");
                app.exit(0);
            }
            _ => {
                eprintln!("Error: unknown menu event: {:?}", e.id);
            }
        })
        .invoke_handler(tauri::generate_handler![
            list_applications,
            open_application,
            show_window,
            hide_window
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.set_activation_policy(tauri::ActivationPolicy::Accessory);

    app.run(|_app_handle, _event| {});
}

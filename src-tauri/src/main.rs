#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    path::Path,
};

use serde::Serialize;
use walkdir::WalkDir;

static SCRAPED_FILE_NAME: &str = "scraped_file.txt";
static TO_CONVERT_DIR: &str = "to_convert";

#[derive(Debug, Serialize)]
struct SearchInfo {
    file_names: Vec<String>,
    total_size: u64,
}

#[tauri::command]
fn search_files(path: &str, in_ext: &str) -> SearchInfo {
    let mut sum = 0;
    let files = WalkDir::new(path)
        .into_iter()
        .filter_map(Result::ok)
        .map(|entry| {
            sum += match entry.metadata() {
                Ok(file) => file.len(),
                Err(_) => 0,
            };
            entry.path().display().to_string()
        })
        .filter(|p| p.to_lowercase().ends_with(&format!(".{}", &in_ext)))
        .collect::<Vec<_>>();

    SearchInfo {
        file_names: files,
        total_size: sum,
    }
}

#[tauri::command]
fn gather_files(files: Vec<String>, in_ext: &str) -> tauri::Result<()> {
    let base_path = tauri::api::path::desktop_dir().expect("$DESKTOP scope must be set");
    let scrape_file_path = Path::new(&base_path).join(SCRAPED_FILE_NAME);
    let dir_path = Path::new(&base_path).join(TO_CONVERT_DIR);

    let mut save_file = OpenOptions::new()
        .write(true)
        .create(true)
        .open(&scrape_file_path)?;
    save_file.write_all(files.join("\n").as_bytes())?;

    if !dir_path.exists() {
        fs::create_dir(&dir_path).expect("Could not create folder for items to convert");
    }

    for (i, file) in files.iter().enumerate() {
        fs::copy(file, dir_path.join(format!("{}.{}", i, &in_ext)))
            .expect("Could not copy file: {file} to path {}");
    }

    Ok(())
}

#[tauri::command]
fn restore_files(in_ext: &str, out_ext: &str) -> tauri::Result<()> {
    let base_path = tauri::api::path::desktop_dir().expect("$DESKTOP scope must be set");

    let scrape_file_path = Path::new(&base_path).join(SCRAPED_FILE_NAME);
    let dir_path = Path::new(&base_path).join(TO_CONVERT_DIR);

    let mut scrape_file = File::open(&scrape_file_path)?;
    let mut files_scraped = String::new();
    scrape_file.read_to_string(&mut files_scraped)?;

    for (i, old_file_path) in files_scraped.lines().enumerate() {
        let current_path = dir_path.join(format!("{i}.{out_ext}"));
        let new_path = old_file_path.replace(&format!(".{in_ext}"), &format!(".{out_ext}"));
        let new_path = Path::new(&new_path);

        // allow deleting files in `to_convert` directory
        if current_path.exists() && !new_path.exists() {
            fs::copy(&current_path, new_path)?;
            fs::remove_file(current_path)?;
        }
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            search_files,
            gather_files,
            restore_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

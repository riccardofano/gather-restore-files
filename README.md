# Gather-Restore app

Quick and dirty Tauri app to find InDesign files (.indd) from a chosen directory and its subdirectories to save them in a folder so a script can then convert them all into InDesign Markup Language (.idml).

## How to use

- Choose the directory you wish to search
- Press "Search files" to list all files with the corresponding extension and their total size
- Press "Gather files" to copy them to a directory in on the desktop
- Use [the script](https://help.redokun.com/article/35-batch-convert-idml-file) to convert the files, this will leave create a new .idml file
- Press "Restore files" to put the new converted files back in the directory they came from and delete the old file from the desktop directory.

"Restore files" only restores and purges the files that have been successfully converted.  
This means that if the script fails mid way through you can restore the successful ones and avoid reprocessing them on the next attempt.

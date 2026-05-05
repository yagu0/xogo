#!/usr/bin/python

import os
import hashlib
import shutil
import json
import re

# --- Configuration ---
SOURCE_DIR = "."
DEST_DIR = "dist"
EXTENSIONS_TO_HASH = [".html", ".js", ".css", ".svg"] #all edited files
EXTENSIONS_TO_UPDATE = [".html", ".js", ".css"] #.svg don't contain refs
DYNAMIC_LOAD_EXTENSIONS = (".html", ".js", ".css") #loaded from app.js

IGNORE_FILE_UPDATE = {"app.js"}
# Files and folders to totally ignore
IGNORE_FILES = {
    "LICENSE", "README.md", "TODO", "bundle.py", "js/parameters.js.dist",
    "initialize.sh", "package-lock.json", "package.json", "js/server.js", ".gitignore"
    "nginx_config.example", "start.sh", "stop.sh", "assets.zip", "extras.zip", ".pid"
}
IGNORE_DIRS = {".git", "node_modules", DEST_DIR}

def get_file_hash(filepath):
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()[:8]

def run_bundle():
    # Clean destination folder
    if os.path.exists(DEST_DIR):
        shutil.rmtree(DEST_DIR)
    os.makedirs(DEST_DIR)

    hash_map = {}

    # 1. Walk the tree and do selective copies
    for root, dirs, files in os.walk(SOURCE_DIR):
        # Filter folders to ignore so that walk() doesn't step in
        dirs[:] = [d for d in dirs if os.path.relpath(os.path.join(root, d), SOURCE_DIR) not in IGNORE_DIRS]

        for file in files:
            ext = os.path.splitext(file)[1]
            rel_path = os.path.relpath(os.path.join(root, file), SOURCE_DIR)
            if rel_path in IGNORE_FILES:
                continue

            # Determine destination name (with or without hash)
            if ext in EXTENSIONS_TO_HASH and file != "index.html":
                h = get_file_hash(os.path.join(root, file))
                new_name = f"{os.path.splitext(file)[0]}.{h}{ext}"
                new_rel_path = os.path.relpath(os.path.join(root, new_name), SOURCE_DIR)
                hash_map[rel_path] = new_rel_path
            else:
                new_name = file

            dest_path = os.path.join(DEST_DIR, os.path.dirname(rel_path), new_name)
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            shutil.copy2(os.path.join(root, file), dest_path)

    # 2. Update references
    for root, dirs, files in os.walk(DEST_DIR):
        for file in files:
            print(file)
            if os.path.splitext(file)[1] in EXTENSIONS_TO_UPDATE and not re.match(r'^app\.[^\.]+\.js$', file):
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Replace old refs with new ones
                for old_rel_path in hash_map.keys():
                    if old_rel_path in content:
                        content = content.replace(old_rel_path, hash_map[old_rel_path])

                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)

    print(f"Build completed in {DEST_DIR}.")
    print(f"{len(hash_map)} hashed files.")

    # 3. Write hash_map to manifest file:
    hash_manifest = {
        k: v for k, v in hash_map.items()
        if k.startswith("variants/") and k.endswith(DYNAMIC_LOAD_EXTENSIONS)
    }
    with open('dist/manifest.json', 'w') as f:
        json.dump(hash_manifest, f, indent=2)

if __name__ == "__main__":
    run_bundle()

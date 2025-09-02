#!/usr/bin/env python3
"""
remove_specific_types_mutants.py
================================

This script removes mutants whose ``type`` matches any of a given set
of target types from one or more JSON files. Each JSON file is
expected to contain a list of mutant dictionaries. The script
filters out entries whose ``type`` field (case-insensitive) is in
the provided list of target types, and then overwrites the original
file with the filtered content. If no matching entries are found, the
file remains unchanged.

Usage example::

    python remove_specific_types_mutants.py \
        --json-files bronze_mutants.json,silver_mutants.json,gold_mutants.json,plat_mutants.json \
        --types VIDEOGAME,SEASONAL

By default, if ``--types`` is not specified, the script will remove
mutants with types ``VIDEOGAME`` and ``SEASONAL``. To ensure that
normal_mutants.json is not affected, simply do not include it in
``--json-files``.

"""

import argparse
import json
import os
import sys
from typing import Any, List, Tuple, Set


def remove_entries_of_types(data: List[Any], target_types: Set[str]) -> Tuple[List[Any], int]:
    """Return a new list with entries of specified types removed.

    Parameters
    ----------
    data : list
        The list of mutant dictionaries to filter.
    target_types : set of str
        A set of mutant types to remove (uppercase for case-insensitive
        comparison).

    Returns
    -------
    (list, int)
        A tuple containing the filtered list and the number of
        removed entries.
    """
    filtered: List[Any] = []
    removed_count = 0
    for item in data:
        if isinstance(item, dict):
            type_value = str(item.get('type', '')).strip().upper()
            if type_value in target_types:
                removed_count += 1
                continue  # skip this item
        filtered.append(item)
    return filtered, removed_count


def process_file(path: str, target_types: Set[str]) -> None:
    """Process a single JSON file, removing mutants of the given types.

    Parameters
    ----------
    path : str
        Path to the JSON file to process.
    target_types : set of str
        A set of mutant types to remove (uppercase).
    """
    if not os.path.isfile(path):
        print(f"⚠️  File '{path}' does not exist; skipping.")
        return
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as exc:
        print(f"⚠️  Failed to load JSON file '{path}': {exc}")
        return
    if isinstance(data, list):
        filtered, removed = remove_entries_of_types(data, target_types)
        if removed > 0:
            try:
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(filtered, f, ensure_ascii=False, indent=2)
                types_str = ', '.join(sorted(target_types))
                print(f"🗑️  Removed {removed} entries of types [{types_str}] from {path}")
            except Exception as exc:
                print(f"⚠️  Failed to write filtered JSON file '{path}': {exc}")
        else:
            print(f"ℹ️  No entries of types {', '.join(target_types)} found in {path}")
    else:
        print(
            f"⚠️  Expected a list as the top-level JSON structure in '{path}',"
            f" but found {type(data).__name__}. No changes made."
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Remove mutants of specified types from JSON files containing lists of mutants.'
    )
    parser.add_argument(
        '--json-files',
        required=True,
        help='Comma-separated list of JSON file paths to process'
    )
    parser.add_argument(
        '--types',
        default='VIDEOGAME,SEASONAL',
        help='Comma-separated list of mutant types to remove (case-insensitive). Default: VIDEOGAME,SEASONAL'
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    file_list = [jf.strip() for jf in args.json_files.split(',') if jf.strip()]
    if not file_list:
        print("⚠️  No JSON files specified.")
        sys.exit(1)
    target_types = {t.strip().upper() for t in args.types.split(',') if t.strip()}
    if not target_types:
        print("⚠️  No target types specified for removal.")
        sys.exit(1)
    for json_file in file_list:
        process_file(json_file, target_types)


if __name__ == '__main__':
    main()
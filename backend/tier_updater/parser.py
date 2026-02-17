"""
Parser for tier data from various formats (txt, xlsx)
Expected format in files:
- Each line should contain mutant NAME and tier value
- Format: mutant_name,tier_value or mutant_name tier_value
- Example: Робот,2+ or Андроид,3-
"""

import json
import re
from typing import Dict, Optional
from pathlib import Path


def load_mutant_mapping(mutants_json_path: Path) -> Dict[str, str]:
    """
    Load mapping from Russian names to mutant IDs
    
    Args:
        mutants_json_path: Path to mutants.json file
        
    Returns:
        Dict mapping Russian names to mutant IDs
    """
    with open(mutants_json_path, 'r', encoding='utf-8') as f:
        mutants_data = json.load(f)
    
    name_to_id = {}
    for mutant in mutants_data:
        name = mutant['name'].strip().lower()
        mutant_id = mutant['id']
        name_to_id[name] = mutant_id
        
        # Also add variations without special characters for flexibility
        clean_name = re.sub(r'[^\w\s]', '', mutant['name']).strip().lower()
        if clean_name != name:
            name_to_id[clean_name] = mutant_id
    
    return name_to_id


def normalize_tier_value(tier: str) -> str:
    """
    Normalize tier value to accepted format
    Valid tiers: 1+, 1-, 2+, 2, 2-, 3+, 3, 3-, 4
    """
    tier = tier.strip().upper()
    
    # Map common variations to standard format
    tier_mapping = {
        '1+': '1+', '1ПЛЮС': '1+', '1 ПЛЮС': '1+',
        '1-': '1-', '1МИНУС': '1-', '1 МИНУС': '1-',
        '2+': '2+', '2ПЛЮС': '2+', '2 ПЛЮС': '2+',
        '2': '2', '2НОРМАЛЬНЫЙ': '2', '2 НОРМ': '2',
        '2-': '2-', '2МИНУС': '2-', '2 МИНУС': '2-',
        '3+': '3+', '3ПЛЮС': '3+', '3 ПЛЮС': '3+',
        '3': '3', '3НОРМАЛЬНЫЙ': '3', '3 НОРМ': '3',
        '3-': '3-', '3МИНУС': '3-', '3 МИНУС': '3-',
        '4': '4', '4НОРМАЛЬНЫЙ': '4', '4 НОРМ': '4'
    }
    
    normalized_tier = tier_mapping.get(tier, tier)
    
    # Validate tier format
    valid_tiers = {'1+', '1-', '2+', '2', '2-', '3+', '3', '3-', '4'}
    if normalized_tier not in valid_tiers:
        raise ValueError(f"Invalid tier value: {normalized_tier}. Valid tiers are: {', '.join(valid_tiers)}")
    
    return normalized_tier


def parse_tier_from_txt(file_path: Path, name_to_id: Dict[str, str]) -> Dict[str, str]:
    """
    Parse tier data from text file
    
    Expected formats:
    - Робот,2+
    - Андроид 3-
    - Ксеноморф: 1+
    """
    tiers = {}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or line.startswith('//'):
                continue
            
            # Try comma-separated format
            if ',' in line:
                parts = line.split(',')
                if len(parts) >= 2:
                    mutant_name = parts[0].strip().lower()
                    tier = normalize_tier_value(parts[1].strip())
                    
                    # Find matching mutant ID
                    mutant_id = find_mutant_id_by_name(mutant_name, name_to_id)
                    if mutant_id:
                        tiers[mutant_id] = tier
            
            # Try space-separated format
            elif ':' in line:
                parts = line.split(':')
                if len(parts) >= 2:
                    mutant_name = parts[0].strip().lower()
                    tier = normalize_tier_value(parts[1].strip())
                    
                    # Find matching mutant ID
                    mutant_id = find_mutant_id_by_name(mutant_name, name_to_id)
                    if mutant_id:
                        tiers[mutant_id] = tier
            
            # Try simple space format (last word is tier)
            else:
                parts = line.split()
                if len(parts) >= 2:
                    # Assume last part is tier, rest is mutant name
                    tier = normalize_tier_value(parts[-1].strip())
                    mutant_name_parts = parts[:-1]
                    mutant_name = ' '.join(mutant_name_parts).strip().lower()
                    
                    # Find matching mutant ID
                    mutant_id = find_mutant_id_by_name(mutant_name, name_to_id)
                    if mutant_id:
                        tiers[mutant_id] = tier
    
    return tiers


def parse_tier_from_xlsx(file_path: Path, name_to_id: Dict[str, str]) -> Dict[str, str]:
    """
    Parse tier data from Excel file
    
    Expected columns:
    - Column A: Mutant Name (e.g., Робот)
    - Column B: Tier (e.g., 1+, 2-, 3)
    """
    try:
        import openpyxl
    except ImportError:
        raise ImportError("openpyxl is required for Excel file parsing. Install with: pip install openpyxl")
    
    tiers = {}
    workbook = openpyxl.load_workbook(file_path)
    sheet = workbook.active
    
    for row in sheet.iter_rows(min_row=1, values_only=True):
        if row[0] and row[1]:  # Both name and tier present
            mutant_name = str(row[0]).strip().lower()
            tier = normalize_tier_value(str(row[1]).strip())
            
            # Find matching mutant ID
            mutant_id = find_mutant_id_by_name(mutant_name, name_to_id)
            if mutant_id:
                tiers[mutant_id] = tier
    
    return tiers


def find_mutant_id_by_name(name: str, name_to_id: Dict[str, str]) -> Optional[str]:
    """
    Find mutant ID by Russian name with fuzzy matching
    """
    # Direct match
    if name in name_to_id:
        return name_to_id[name]
    
    # Partial match
    for stored_name, mutant_id in name_to_id.items():
        if name in stored_name or stored_name in name:
            return mutant_id
    
    # If no match found, return None
    return None


def detect_file_format(file_path: Path) -> str:
    """Detect file format based on extension"""
    ext = file_path.suffix.lower()
    if ext == '.txt' or ext == '.csv':
        return 'txt'
    elif ext in ['.xlsx', '.xls']:
        return 'xlsx'
    else:
        raise ValueError(f"Unsupported file format: {ext}")


def parse_tier_file(file_path: Path, mutants_json_path: Path = None) -> Dict[str, str]:
    """
    Parse tier data from file (auto-detect format)
    
    Args:
        file_path: Path to the input file
        mutants_json_path: Path to mutants.json for name-to-ID mapping (defaults to standard location)
    
    Returns:
        Dict[str, str]: Dictionary mapping mutant IDs to tier values
    """
    if mutants_json_path is None:
        # Default location relative to this file
        mutants_json_path = Path(__file__).parent.parent / 'src' / 'data' / 'mutants' / 'mutants.json'
    
    # Load the name to ID mapping
    name_to_id = load_mutant_mapping(mutants_json_path)
    
    file_format = detect_file_format(file_path)
    
    if file_format == 'txt':
        return parse_tier_from_txt(file_path, name_to_id)
    elif file_format == 'xlsx':
        return parse_tier_from_xlsx(file_path, name_to_id)
    
    return {}


# Export functions for use in other modules
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        file_path = Path(sys.argv[1])
        result = parse_tier_file(file_path)
        print(result)

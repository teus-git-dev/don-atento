import pandas as pd
import json
import numpy as np

def convert_nan(obj):
    if isinstance(obj, float) and np.isnan(obj):
        return None
    return obj

files = [
    '../ARRENDATARIOS MARZO 17 DE 2026.xls',
    '../INMUEBLES MARZO 17 DE 2026.xls',
    '../PROPIETARIOS MARZO 17 DE 2026.xls'
]

for f in files:
    print(f"--- FILE: {f} ---")
    try:
        df = pd.read_excel(f, engine='xlrd')
        print("HEADERS:")
        print(df.columns.tolist())
        print("\nSAMPLE ROW:")
        if not df.empty:
            row_dict = {k: convert_nan(v) for k, v in df.iloc[0].to_dict().items()}
            print(json.dumps(row_dict, indent=2, ensure_ascii=False, default=str))
    except Exception as e:
        print("ERROR:", e)
    print("\n" + "="*50 + "\n")

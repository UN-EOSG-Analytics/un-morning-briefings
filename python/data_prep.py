# Export DataFrame to JSON in records format
# Export to public/data/

from pathlib import Path

import pandas as pd

input_path = Path("data") / "your_data.csv"
df = pd.read_csv(input_path)

output_path = Path("public") / "data" / "data.json"
output_path.parent.mkdir(parents=True, exist_ok=True)

df.to_json(output_path, orient="records", indent=2)

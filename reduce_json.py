import json
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

p = "/Users/pablo/Documents/Webapp/fantasyscrapper/json_files/laligafantasy_laliga_data.json"
with open(p, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Creamos la versión reducida
reduced_data = [
    {
        "name": player["name"],
        "team": player["team"],
        "position": player["position"],
        "price": player["price"],
        "price_history": player["price_history"],
        "time_history": player["time_history"]
    }
    for player in data
]

# Guardamos el JSON reducido
with open('players.json', 'w', encoding='utf-8') as f:
    json.dump(reduced_data, f, ensure_ascii=False, indent=2)

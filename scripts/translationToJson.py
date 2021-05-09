import sys
import os
import csv
import json


def format(row):
    name = row['identity']+'.json'
    data = {
        'name': row['name'],
        'level': row['level'],
        'description': row['description'],
        'image': row['image'],
        'skin': row['skin'],
        'rarity': row['rarity'],
        'identity': row['identity'],
    }
    if 'team' in row:
        data['team'] = row['team']
    return name, data


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('arguments error')
    name = sys.argv[1]
    outputPath = sys.argv[2]
    if not os.path.exists(outputPath):
        os.makedirs(outputPath)
    with open(name, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            jsonName, data = format(row)
            with open(os.path.join(outputPath, jsonName), 'a') as jsonfile:
                jsonfile.write(json.dumps(data, indent=4))

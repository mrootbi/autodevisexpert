import json
import time
import requests

BASE_URL = "https://www.cartec.ma/api/select-vehicle"
HEADERS = {"User-Agent": "Mozilla/5.0", "X-Requested-With": "XMLHttpRequest"}

def scrape_cartec():
    full_catalog = []
    
    # 1. جيب الماركات
    res_brands = requests.get(f"{BASE_URL}/manufacturers", headers=HEADERS)
    brands = res_brands.json().get("data", [])
    
    for brand in brands:
        print(f"🔄 جاري سحب ماركة: {brand['name']}")
        brand_data = {"marque": brand['name'], "models": []}
        
        # 2. جيب الموديلات بـ السميات ديالهم (بحال Octavia I (1U2)...)
        res_models = requests.get(f"{BASE_URL}/model-series/{brand['id']}", headers=HEADERS)
        models = res_models.json().get("data", [])
        
        for model in models:
            # 3. جيب الموتورات د كل موديل
            res_engines = requests.get(f"{BASE_URL}/vehicles/{model['id']}", headers=HEADERS)
            engines_data = res_engines.json().get("data", [])
            engines = [e['name'] for e in engines_data]
            
            brand_data["models"].append({
                "name": model['name'], # هنا كيجيب السمية الطويلة د الموديل
                "engines": engines
            })
            
        full_catalog.append(brand_data)
        time.sleep(0.5)

    with open("euroCarsDatabase.json", "w", encoding="utf-8") as f:
        json.dump(full_catalog, f, ensure_ascii=False, indent=2)
    print("✅ سالينا! الفيشي `euroCarsDatabase.json` واجد فـ البيرو.")

if __name__ == "__main__":
    scrape_cartec()
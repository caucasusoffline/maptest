#!/usr/bin/env python3
"""
Ookla Open Data -> Georgia internet speed extractor.

მოაქვს Ookla Speedtest ღია მონაცემები (mobile/fixed), ჭრის მათ საქართველოს
საზღვრებით და ინახავს GeoJSON ფაილებად და აგრეგირებულ JSON-ებად.
მონაცემები ოპტიმიზირებულია: გეომეტრია გარდაქმნილია წერტილებად (Centroid) 
და დამრგვალებულია, ხოლო მუნიციპალიტეტების მიხედვით აგრეგაცია ხდება python-ში.

Requirements:
    pip install pandas geopandas shapely pyarrow s3fs
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

import geopandas as gpd
import pandas as pd
import s3fs
from shapely import wkt

# --------------------------------------------------------------------------- #
# კონფიგურაცია
# --------------------------------------------------------------------------- #

DATA_DIR = Path("data")
LOCAL_BND_FILE = Path("municipality.geojson")

# Georgia-ს დაახლოებითი bounding box
MIN_LON, MIN_LAT, MAX_LON, MAX_LAT = 40.0, 41.0, 46.8, 43.6

S3_BUCKET = "ookla-open-data"
S3_PREFIX = "parquet/performance"

QUARTER_START = {1: "01-01", 2: "04-01", 3: "07-01", 4: "10-01"}

REQUIRED_COLUMNS = [
    "tile",
    "avg_d_kbps",
    "avg_u_kbps",
    "avg_lat_ms",
    "tests",
    "devices",
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("ookla-georgia")

_S3 = s3fs.S3FileSystem(anon=True)

MUNI_NAME_MAP = { 
    "მცხეთის": "მცხეთა", "ახმეტის": "ახმეტა", "თელავის": "თელავი", 
    "გურჯაანის": "გურჯაანი", "ყვარლის": "ყვარელი", "სიღნაღის": "სიღნაღი", 
    "დედოფლისწყაროს": "დედოფლისწყარო", "ლაგოდეხის": "ლაგოდეხი", 
    "საგარეჯოს": "საგარეჯო", "თიანეთის": "თიანეთი", "დუშეთის": "დუშეთი", 
    "ყაზბეგის": "ყაზბეგი", "კასპის": "კასპი", "გორის": "გორი", "ქარელის": "ქარელი", 
    "ხაშურის": "ხაშური", "ბორჯომის": "ბორჯომი", "ახალციხის": "ახალციხე", 
    "ადიგენის": "ადიგენი", "ასპინძის": "ასპინძა", "ახალქალაქის": "ახალქალაქი", 
    "ნინოწმინდის": "ნინოწმინდა", "წალკის": "წალკა", "დმანისის": "დმანისი", 
    "ბოლნისის": "ბოლნისი", "მარნეულის": "მარნეული", "გარდაბნის": "გარდაბანი", 
    "თეთრიწყაროს": "თეთრიწყარო", "ონისა": "ონი", "ონის": "ონი", 
    "ამბროლაურის": "ამბროლაური", "ცაგერის": "ცაგერი", "ლენტეხის": "ლენტეხი", 
    "მესტიის": "მესტია", "საჩხერის": "საჩხერე", "ჭიათურის": "ჭიათურა", 
    "ხარაგაულის": "ხარაგაული", "ზესტაფონის": "ზესტაფონი", "ბაღდათის": "ბაღდათი", 
    "ვანის": "ვანი", "სამტრედიის": "სამტრედია", "ხონის": "ხონი", "წყალტუბოს": "წყალტუბო", 
    "ტყიბულის": "ტყიბული", "თერჯოლის": "თერჯოლა", "ოზურგეთის": "ოზურგეთი", 
    "ლანჩხუთის": "ლანჩხუთი", "ჩოხატაურის": "ჩოხატაური", "აბაშის": "აბაშა", 
    "სენაკის": "სენაკი", "მარტვილის": "მარტვილი", "ხობის": "ხობი", 
    "ზუგდიდის": "ზუგდიდი", "წალენჯიხის": "წალენჯიხა", "ჩხოროწყუს": "ჩხოროწყუ", 
    "ბათუმის": "ბათუმი", "ქედის": "ქედა", "ქობულეთის": "ქობულეთი", 
    "შუახევის": "შუახევი", "ხელვაჩაურის": "ხელვაჩაური", "ხულოს": "ხულო", 
    "გულრიფშის": "გულრიფში", "გალის": "გალი", "ოჩამჩირის": "ოჩამჩირე", 
    "სოხუმის": "სოხუმი", "გუდაუთის": "გუდაუთა", "გაგრის": "გაგრა", 
    "ცხინვალის": "ცხინვალი", "ჯავის": "ჯავა", "ახალგორის": "ახალგორი", "ზნაურის": "ზნაური"
}

def normalize_muni_name(name: str) -> str:
    if not isinstance(name, str): return "უცნობი მუნიციპალიტეტი"
    n = name.replace(" რაიონი", "").replace(" მუნიციპალიტეტი", "")
    return MUNI_NAME_MAP.get(n, n)

@dataclass(frozen=True)
class Period:
    year: int
    quarter: int

    @property
    def date_str(self) -> str:
        return f"{self.year}-{QUARTER_START[self.quarter]}"
        
    @property
    def period_id(self) -> str:
        return f"{self.year}_Q{self.quarter}"

    def s3_key(self, network_type: str) -> str:
        return (
            f"{S3_PREFIX}/type={network_type}/year={self.year}/"
            f"quarter={self.quarter}/{self.date_str}_performance_{network_type}_tiles.parquet"
        )

    def s3_url(self, network_type: str) -> str:
        return f"s3://{S3_BUCKET}/{self.s3_key(network_type)}"

    def output_points_path(self, network_type: str) -> Path:
        return DATA_DIR / f"georgia_{network_type}_{self.period_id}.geojson"
        
    def output_agg_path(self, network_type: str) -> Path:
        return DATA_DIR / f"georgia_{network_type}_{self.period_id}_agg.json"

# --------------------------------------------------------------------------- #
# საზღვრების ჩატვირთვა
# --------------------------------------------------------------------------- #

def get_georgia_municipalities() -> gpd.GeoDataFrame:
    """ტვირთავს საქართველოს მუნიციპალიტეტებს სივრცითი დაკავშირებისთვის."""
    log.info("ვტვირთავთ საქართველოს საზღვრებს (%s)...", LOCAL_BND_FILE)

    if not LOCAL_BND_FILE.exists():
        raise FileNotFoundError(f"ვერ ვიპოვე ფაილი: {LOCAL_BND_FILE}")

    try:
        gdf = gpd.read_file(LOCAL_BND_FILE)
    except Exception:
        gdf = gpd.read_file(LOCAL_BND_FILE, engine="fiona")

    gdf["geometry"] = gdf["geometry"].make_valid()

    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    elif gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs("EPSG:4326")
        
    # Standardize municipality name column
    name_col = 'NAME_2' if 'NAME_2' in gdf.columns else ('NAME_1' if 'NAME_1' in gdf.columns else 'name')
    if name_col in gdf.columns:
        gdf['muni_name'] = gdf[name_col].apply(normalize_muni_name)
    else:
        gdf['muni_name'] = "უცნობი მუნიციპალიტეტი"

    return gdf

# --------------------------------------------------------------------------- #
# ფაილების დამუშავება
# --------------------------------------------------------------------------- #

def get_target_periods(network_type: str, target_year: int | None, target_quarter: int | None) -> list[Period]:
    candidates: list[Period]
    if target_year and target_quarter:
        candidates = [Period(target_year, target_quarter)]
    else:
        current_year = datetime.now().year
        candidates = [
            Period(year, q)
            for year in range(current_year, current_year - 3, -1)
            for q in (4, 3, 2, 1)
        ]

    valid: list[Period] = []
    for period in candidates:
        key = period.s3_key(network_type)
        try:
            if _S3.exists(f"{S3_BUCKET}/{key}"):
                valid.append(period)
        except Exception as exc:
            continue
    return valid

def process_period(network_type: str, period: Period, georgia_municipalities: gpd.GeoDataFrame) -> None:
    points_file = period.output_points_path(network_type)
    agg_file = period.output_agg_path(network_type)

    if points_file.exists() and agg_file.exists():
        log.info("✅ უკვე არსებობს: %s Q%s (გამოვტოვებთ)", period.year, period.quarter)
        return

    log.info("მიმდინარეობს ჩამოტვირთვა: %s Q%s...", period.year, period.quarter)

    try:
        df = pd.read_parquet(
            period.s3_url(network_type),
            columns=REQUIRED_COLUMNS,
            storage_options={"anon": True},
        )
    except Exception as exc:
        log.error("❌ ჩამოტვირთვის შეცდომა: %s", exc)
        return

    try:
        coords = df["tile"].str.extract(r"\(\(\s*([0-9.\-]+)\s+([0-9.\-]+)")
        df["lon"] = pd.to_numeric(coords[0], errors="coerce")
        df["lat"] = pd.to_numeric(coords[1], errors="coerce")
        df = df.dropna(subset=["lon", "lat"])

        bbox_df = df[
            df["lon"].between(MIN_LON, MAX_LON) & df["lat"].between(MIN_LAT, MAX_LAT)
        ].copy()

        if bbox_df.empty:
            log.warning("⚠️ %s Q%s ცარიელია bounding box-ში.", period.year, period.quarter)
            return

        bbox_df["geometry"] = bbox_df["tile"].apply(wkt.loads)
        gdf = gpd.GeoDataFrame(bbox_df, geometry="geometry", crs="EPSG:4326")

        # ზომის შემცირება: პოლიგონების გადაქცევა წერტილებად (Centroid) და დამრგვალება
        gdf["geometry"] = gdf["geometry"].centroid
        gdf.geometry = gpd.points_from_xy(gdf.geometry.x.round(5), gdf.geometry.y.round(5))

        log.info("  მიმდინარეობს საზღვრებთან დაკავშირება (sjoin)...")
        # Spatial join - find which municipality each point belongs to
        gdf_joined = gpd.sjoin(gdf, georgia_municipalities[['muni_name', 'geometry']], how="inner", predicate="intersects")

        if gdf_joined.empty:
            log.warning("  ⚠️ საზღვრებში გადაკვეთა არ მოხდა.")
            return

        # გადაყვანა Mbps და მომზადება
        gdf_joined["download"] = (gdf_joined["avg_d_kbps"] / 1000).round(1)
        gdf_joined["upload"] = (gdf_joined["avg_u_kbps"] / 1000).round(1)
        gdf_joined["ping"] = gdf_joined["avg_lat_ms"].round(0).astype(int)
        
        # --- 1. შევინახოთ Points GeoJSON (ზომაში შემცირებული) ---
        points_out = gdf_joined[["geometry", "download", "upload", "ping", "tests", "devices"]].copy()
        
        DATA_DIR.mkdir(exist_ok=True)
        points_out.to_file(points_file, driver="GeoJSON")
        log.info("✅ შეინახა Points: %s (%d ლოკაცია)", points_file.name, len(points_out))

        # --- 2. შევინახოთ Aggregated JSON (მუნიციპალიტეტებისთვის) ---
        agg_data = {}
        for muni, group in gdf_joined.groupby("muni_name"):
            agg_data[muni] = {
                "download": round(group["download"].mean(), 1),
                "download_min": round(group["download"].min(), 1),
                "download_max": round(group["download"].max(), 1),
                "upload": round(group["upload"].mean(), 1),
                "upload_min": round(group["upload"].min(), 1),
                "upload_max": round(group["upload"].max(), 1),
                "ping": round(group["ping"].mean(), 0),
                "ping_min": round(group["ping"].min(), 0),
                "ping_max": round(group["ping"].max(), 0),
                "tests": int(group["tests"].sum()),
                "devices": int(group["devices"].sum()),
                "locations": len(group)
            }
            
        with open(agg_file, "w", encoding="utf-8") as f:
            json.dump(agg_data, f, ensure_ascii=False, separators=(',', ':'))
        log.info("✅ შეინახა Agg: %s", agg_file.name)

    except Exception as exc:
        log.error("❌ დამუშავების შეცდომა: %s", exc, exc_info=True)


# --------------------------------------------------------------------------- #
# ტრენდების გენერაცია
# --------------------------------------------------------------------------- #

def generate_trends(georgia_municipalities: gpd.GeoDataFrame) -> None:
    log.info("ვაგენერირებთ ტრენდების მონაცემებს...")
    q_to_month = {"Q1": "01", "Q2": "04", "Q3": "07", "Q4": "10"}
    
    for network_type in ["mobile", "fixed"]:
        trend_data = {
            "national": [],
            "municipalities": {m: [] for m in georgia_municipalities['muni_name'].unique()}
        }
        
        agg_files = sorted(DATA_DIR.glob(f"georgia_{network_type}_*_agg.json"))
        if not agg_files:
            continue
            
        for af in agg_files:
            parts = af.stem.split('_')
            year = parts[2]
            quarter = parts[3]
            quarter_str = f"{year} {quarter}"
            timestamp = int(datetime.strptime(f"{year}-{q_to_month[quarter]}-01", "%Y-%m-%d").timestamp() * 1000)
            
            with open(af, "r", encoding="utf-8") as f:
                agg_data = json.load(f)
                
            tot_d = tot_u = tot_p = 0
            count = 0
            for muni, stats in agg_data.items():
                if stats.get("download", 0) > 0:
                    tot_d += stats["download"]
                    tot_u += stats["upload"]
                    tot_p += stats["ping"]
                    count += 1
                
                if muni in trend_data["municipalities"]:
                    trend_data["municipalities"][muni].append({
                        "quarter": quarter_str,
                        "download": stats["download"],
                        "upload": stats["upload"],
                        "ping": stats["ping"],
                        "timestamp": timestamp
                    })
                    
            if count > 0:
                trend_data["national"].append({
                    "quarter": quarter_str,
                    "download": round(tot_d / count, 1),
                    "upload": round(tot_u / count, 1),
                    "ping": round(tot_p / count, 0),
                    "timestamp": timestamp
                })
                
        # დალაგება დროის მიხედვით
        trend_data["national"].sort(key=lambda x: x["timestamp"])
        for m in trend_data["municipalities"]:
            trend_data["municipalities"][m].sort(key=lambda x: x["timestamp"])
            
        trend_file = DATA_DIR / f"trend_{network_type}.json"
        with open(trend_file, "w", encoding="utf-8") as f:
            json.dump(trend_data, f, ensure_ascii=False, separators=(',', ':'))
            
        log.info("✅ შეიქმნა ტრენდის ფაილი: %s", trend_file.name)

# --------------------------------------------------------------------------- #
# Metadata
# --------------------------------------------------------------------------- #

def generate_metadata() -> None:
    if not DATA_DIR.exists():
        return

    # ვაგროვებთ უნიკალურ პერიოდებს (მაგ. "2025_Q1")
    mobile_periods = set()
    fixed_periods = set()
    
    for p in DATA_DIR.glob("georgia_mobile_*_agg.json"):
        mobile_periods.add(p.stem.replace("georgia_mobile_", "").replace("_agg", ""))
        
    for p in DATA_DIR.glob("georgia_fixed_*_agg.json"):
        fixed_periods.add(p.stem.replace("georgia_fixed_", "").replace("_agg", ""))

    metadata_path = DATA_DIR / "metadata.json"
    with metadata_path.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "mobile": sorted(list(mobile_periods), reverse=True),
                "fixed": sorted(list(fixed_periods), reverse=True),
                "generated_at": datetime.utcnow().isoformat() + "Z",
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    log.info("✅ მენეჯერის ფაილი (%s) განახლდა.", metadata_path.name)

# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #

def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, help="სამიზნე წელი (მაგ. 2025)")
    parser.add_argument("--quarter", type=int, choices=[1, 2, 3, 4])
    args = parser.parse_args(argv)
    if bool(args.year) != bool(args.quarter):
        parser.error("--year და --quarter ერთად უნდა იყოს მითითებული, ან არცერთი.")
    return args

def main() -> int:
    args = parse_args()
    DATA_DIR.mkdir(exist_ok=True)

    try:
        georgia_municipalities = get_georgia_municipalities()
    except Exception as exc:
        log.error("საზღვრების ჩატვირთვა ჩავარდა: %s", exc)
        return 1

    for network_type in ("mobile", "fixed"):
        if args.year and args.quarter:
            log.info("--- ვამუშავებთ: %s Q%s (%s) ---", args.year, args.quarter, network_type.upper())
        else:
            log.info("--- ვეძებთ მონაცემებს (%s) ---", network_type.upper())
            
        periods = get_target_periods(network_type, args.year, args.quarter)
        for period in periods:
            process_period(network_type, period, georgia_municipalities)

    generate_trends(georgia_municipalities)
    generate_metadata()
    return 0

if __name__ == "__main__":
    sys.exit(main())

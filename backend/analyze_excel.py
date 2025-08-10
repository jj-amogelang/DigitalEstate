#!/usr/bin/env python3
"""
Excel File Analyzer - Check the structure of the new Excel file
"""

import pandas as pd
import os

def analyze_excel_file():
    """Analyze the structure of the property_research_sample.xlsx file"""
    
    excel_file = "property_research_sample.xlsx"
    
    if not os.path.exists(excel_file):
        print(f"❌ Excel file '{excel_file}' not found!")
        return
    
    try:
        # Read the Excel file
        print(f"📊 Analyzing Excel file: {excel_file}")
        print("=" * 50)
        
        # Check if there are multiple sheets
        excel_data = pd.ExcelFile(excel_file)
        print(f"📋 Available sheets: {excel_data.sheet_names}")
        
        # Read the first sheet (or main sheet)
        df = pd.read_excel(excel_file, sheet_name=0)
        
        print(f"\n📈 Data Overview:")
        print(f"   Rows: {len(df)}")
        print(f"   Columns: {len(df.columns)}")
        
        print(f"\n📝 Column Names:")
        for i, col in enumerate(df.columns, 1):
            print(f"   {i:2d}. {col}")
        
        print(f"\n🔍 Sample Data (first 3 rows):")
        print("=" * 80)
        
        # Display first few rows with better formatting
        for idx in range(min(3, len(df))):
            print(f"\nRow {idx + 1}:")
            for col in df.columns:
                value = df.iloc[idx][col]
                if pd.isna(value):
                    value = "NULL"
                elif isinstance(value, str) and len(str(value)) > 50:
                    value = str(value)[:47] + "..."
                print(f"   {col}: {value}")
        
        print(f"\n🎯 Data Types:")
        for col in df.columns:
            print(f"   {col}: {df[col].dtype}")
        
        print(f"\n📊 Missing Values:")
        missing = df.isnull().sum()
        for col in df.columns:
            if missing[col] > 0:
                print(f"   {col}: {missing[col]} missing values")
            else:
                print(f"   {col}: Complete")
        
        print("\n" + "=" * 50)
        print("✅ Analysis complete!")
        
        return df
        
    except Exception as e:
        print(f"❌ Error analyzing Excel file: {str(e)}")
        return None

if __name__ == "__main__":
    analyze_excel_file()

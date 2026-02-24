# Appsmith Dashboard Setup Guide

## 1. Introduction
This guide details how to set up the Analytics Dashboards for Schiffli Fabric Master using Appsmith and connecting it to your Supabase database.

## 2. Connection Setup
1.  Log in to Appsmith.
2.  Create a new Application named "Schiffli Analytics".
3.  **Datasource**: Click "+" > "Create New Datasource" > "PostgreSQL".
4.  **Connection Details** (Get these from Supabase Project Settings > Database):
    -   **Host**: `db.your-project.supabase.co`
    -   **Port**: `5432`
    -   **Database**: `postgres`
    -   **Username**: `postgres`
    -   **Password**: `[YOUR_DB_PASSWORD]`
    -   **SSL Mode**: Default/Required
5.  Click **Test** then **Save**.

## 3. Creating Queries
Create the following queries inside Appsmith using the datasource created above:

**Query 1: Fabric Inventory (`get_fabric_stats`)**
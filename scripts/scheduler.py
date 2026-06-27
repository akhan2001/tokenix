#!/usr/bin/env python3
"""
Runs the ACPI calculation on a fixed hourly interval.
No external dependencies — uses time.sleep.
"""

import time
from acpi import main

INTERVAL = 3600  # seconds

if __name__ == "__main__":
    print(f"Scheduler started — running every {INTERVAL // 60} minutes.")
    while True:
        main()
        print(f"\nNext run in {INTERVAL // 60} minutes...\n")
        time.sleep(INTERVAL)

#!/usr/bin/env python3
"""Entry point: python fa.py <example|check|inspect|gen|run|status|analyze|report> ..."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fluent_auto.cli import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())

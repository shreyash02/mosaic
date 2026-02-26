"""Shared pytest configuration."""

import pytest


def pytest_addoption(parser):
    parser.addoption(
        "--generate-scenario",
        action="store",
        default=None,
        help="Generate an additional analysis test scenario on-the-fly for the given topic",
    )

"""Serves made-up request rates between services on :8000/metrics.

Only for the dev stack: it gives the dashboard in provisioning/ some flows to draw without a real
system. Every name is invented. Rates are gauges (requests per second) with a little jitter on
every scrape, so the panels have data after the first scrape and move a bit on refresh.
"""

import random
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

rng = random.Random()

# Service to service, requests per second. Includes calls both ways (orders <-> payments), a
# service calling itself (accounts) and a few tiny flows that maxLinks or minValue can hide.
SERVICE_CALLS = [
    ("web", "api-gateway", 420),
    ("mobile", "api-gateway", 260),
    ("partner-api", "api-gateway", 45),
    ("api-gateway", "catalog", 310),
    ("api-gateway", "search", 150),
    ("api-gateway", "orders", 120),
    ("api-gateway", "accounts", 95),
    ("api-gateway", "recommendations", 70),
    ("orders", "payments", 60),
    ("payments", "orders", 18),
    ("orders", "inventory", 85),
    ("orders", "postgres", 140),
    ("catalog", "postgres", 210),
    ("catalog", "cache", 380),
    ("search", "search-index", 150),
    ("accounts", "postgres", 60),
    ("accounts", "accounts", 25),
    ("recommendations", "catalog", 40),
    ("recommendations", "cache", 55),
    ("inventory", "postgres", 50),
    ("payments", "payment-provider", 42),
    ("orders", "notifications", 12),
    ("notifications", "mail-relay", 9),
    ("accounts", "notifications", 4),
    ("inventory", "notifications", 2),
]

# Edge traffic: region -> ingress -> service -> status class, requests per second.
REGIONS = {"eu-west": 1.0, "us-east": 0.8, "ap-south": 0.35}
INGRESS = {"public": 0.85, "partner": 0.15}
SERVICES = {"storefront": 0.5, "checkout": 0.15, "accounts": 0.15, "search": 0.2}
STATUS = {"2xx": 0.93, "3xx": 0.03, "4xx": 0.03, "5xx": 0.01}
EDGE_TOTAL = 900
# A partner only reaches the API services.
PARTNER_SERVICES = {"checkout", "accounts"}


def jitter(v: float) -> float:
    return round(v * rng.uniform(0.92, 1.08), 3)


def render() -> str:
    lines = ["# TYPE demo_service_requests_per_second gauge"]
    for src, dst, rate in SERVICE_CALLS:
        lines.append(
            f'demo_service_requests_per_second{{source_service="{src}",destination_service="{dst}"}} {jitter(rate)}'
        )
    lines.append("# TYPE demo_edge_requests_per_second gauge")
    for region, r in REGIONS.items():
        for ingress, i in INGRESS.items():
            for service, s in SERVICES.items():
                if ingress == "partner" and service not in PARTNER_SERVICES:
                    continue
                for status, st in STATUS.items():
                    # checkout in ap-south has a bad day.
                    if region == "ap-south" and service == "checkout" and status == "5xx":
                        st = 0.2
                    rate = EDGE_TOTAL * r * i * s * st / len(REGIONS)
                    lines.append(
                        f'demo_edge_requests_per_second{{region="{region}",ingress="{ingress}",service="{service}",code_class="{status}"}} {jitter(rate)}'
                    )
    return "\n".join(lines) + "\n"


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path != "/metrics":
            self.send_error(404)
            return
        body = render().encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; version=0.0.4")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args: object) -> None:
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("", 8000), Handler).serve_forever()

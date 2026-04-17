from django.apps import AppConfig


class StockConfig(AppConfig):
    name = 'stock'

    def ready(self) -> None:
        import stock.signals  # noqa: F401 — enregistre les signaux

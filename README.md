# EnergyMind

Структура проекта:

```text
energymind/
├── frontend/        # Клиентская часть
├── backend/         # Серверная часть
├── docs/
│   └── api.yaml     # Общий контракт API
├── docker-compose.yml
├── README.md
└── .gitignore
```

Frontend и backend разрабатываются независимо. Контракт взаимодействия между ними хранится в `docs/api.yaml`.

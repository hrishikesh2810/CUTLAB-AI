# Database Setup

This project uses **PostgreSQL** for data persistence.

## Prerequisites

1.  **PostgreSQL** installed and running.
2.  A database named `cutlab`.
    ```bash
    createdb cutlab
    ```

## Configuration

The database connection string is defined in `backend/database.py`.
Default: `postgresql+asyncpg://postgres:postgres@localhost:5432/cutlab`

To override, set the `DATABASE_URL` environment variable.

## Migrations

We use **Alembic** for migrations.

1.  **Initialize Migrations** (already done in codebase):
    ```bash
    cd backend
    alembic revision --autogenerate -m "Initial schema"
    ```

2.  **Apply Migrations**:
    ```bash
    cd backend
    alembic upgrade head
    ```

## Models

-   **Users**: Stores user info (optional auth).
-   **Videos**: Metadata for uploaded videos.
-   **Projects**: Stores the Editor State (`editor_state` JSONB column).
-   **Exports**: Export history and logs.

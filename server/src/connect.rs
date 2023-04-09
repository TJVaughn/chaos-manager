use tokio;
use tokio_postgres::{Client, NoTls};

pub async fn connect_to_db() -> Client {
    let url = "postgresql://chaos:changeit@localhost:5432/chaos";
    let (client, connection) = tokio_postgres::connect(url, NoTls)
        .await
        .expect("erorr connecting");

    // The connection object performs the actual communication with the database,
    // so spawn it off to run on its own.
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    client
        .batch_execute(
            "
            CREATE TABLE IF NOT EXISTS public.user (
                id SERIAL PRIMARY KEY,
                f_name VARCHAR(255) NOT NULL,
                l_name VARCHAR(255),
                email VARCHAR(255) NOT NULL,
                password TEXT NOT NULL
            );",
        )
        .await
        .expect("create user table error");

    client
        .batch_execute(
            "
            CREATE TABLE IF NOT EXISTS public.category (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                priority INT NOT NULL,
                owner_id INT NOT NULL REFERENCES public.user
            );",
        )
        .await
        .expect("create category table error");

    client
        .batch_execute(
            "
            CREATE TABLE IF NOT EXISTS public.task (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                is_complete BOOL NOT NULL,
                priority INT NOT NULL,
                owner_id INT NOT NULL REFERENCES public.user,
                category_id INT NOT NULL REFERENCES public.category
            );",
        )
        .await
        .expect("create task table error");
    client
        .batch_execute(
            "
        CREATE TABLE IF NOT EXISTS public.duration (
            id SERIAL PRIMARY KEY,
            owner_id INT NOT NULL REFERENCES public.user,
            category_id INT NOT NULL REFERENCES public.category,
            start_hour INT NOT NULL,
            end_hour INT NOT NULL,
            day_as_int INT NOT NULL,
            color VARCHAR(31)
        );",
        )
        .await
        .expect("create duration table error");

    return client;
}

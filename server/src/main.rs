use actix_cors::Cors;
use actix_web::{
    delete, get, http, post, put,
    web::Path,
    web::{self},
    App, HttpRequest, HttpResponse, HttpServer, Responder,
};
use serde::{Deserialize, Serialize};
use tokio;
use tokio_postgres::{Client, NoTls};

#[derive(Serialize)]
struct MyObj {
    name: String,
}

#[get("/user")]
async fn hello() -> impl Responder {
    let obj = MyObj {
        name: "Trevor".to_string(),
    };
    // Ok::<Json<MyObj>, Error>(web::Json(obj))
    //     let obj = MyObj {
    //     name: "Trevor".to_string(),
    // };
    return HttpResponse::Ok().json(obj);
    // Ok(web::Json(obj));
}
#[derive(Serialize)]
struct User {
    id: u32,
    f_name: String,
    l_name: String,
    email: String,
    password: String,
    ip_addresses: Vec<String>,
}
#[derive(Serialize)]
struct Category<'a> {
    id: i32,
    title: String,
    description: Option<String>,
    priority: i32,
    owner_id: i32,
    tasks_todo: Vec<&'a Task>,
    tasks_done: Vec<&'a Task>,
}

#[derive(Serialize, Deserialize)]
struct Task {
    id: i32,
    title: String,
    description: Option<String>,
    is_complete: bool,
    priority: i32,
    owner_id: i32,
    category_id: i32,
}

#[derive(Serialize, Deserialize)]
struct TaskRequest {
    title: String,
    is_complete: bool,
    description: String,
    priority: i32,
    owner_id: i32,
    category_id: i32,
}

#[derive(Serialize, Deserialize)]
struct CategoryRequest {
    title: String,
    description: String,
    priority: i32,
    owner_id: i32,
}

async fn connect_to_db() -> Client {
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

    return client;
}

#[get("/tasks")]
async fn get_tasks() -> impl Responder {
    let client = connect_to_db().await;
    let mut tasks: Vec<Task> = Vec::new();

    for row in client
        .query("SELECT * FROM task", &[])
        .await
        .expect("error getting tasks")
    {
        let task = Task {
            id: row.get(0),
            title: row.get(1),
            description: row.try_get(2).expect("value was null"),
            is_complete: row.get(3),
            priority: row.get(4),
            owner_id: row.get(5),
            category_id: row.get(6),
        };

        tasks.push(task);
    }

    return HttpResponse::Ok().json(tasks);
}

#[derive(Serialize, Deserialize)]
struct InfoPathId {
    id: i32,
}

#[get("/task/{id}")]
async fn get_task_by_id(info: Path<InfoPathId>) -> impl Responder {
    let id = info.id;
    let client = connect_to_db().await;

    let row = client
        .query_one("SELECT * FROM task WHERE id=$1", &[&id])
        .await
        .expect("error getting task");

    let task = Task {
        id: row.get(0),
        title: row.get(1),
        description: row.try_get(2).expect("value was null"),
        is_complete: row.get(3),
        priority: row.get(4),
        owner_id: row.get(5),
        category_id: row.get(6),
    };

    return HttpResponse::Ok().json(task);
}

#[post("/task")]
async fn create_task(_req: HttpRequest, params: web::Json<TaskRequest>) -> impl Responder {
    let client = connect_to_db().await;

    let task = TaskRequest {
        title: params.title.to_owned(),
        description: params.description.to_owned(),
        is_complete: params.is_complete,
        priority: params.priority,
        owner_id: params.owner_id,
        category_id: params.category_id,
    };

    match client
        .execute(
            "INSERT INTO public.task (
                title, 
                description, 
                is_complete, 
                priority, 
                owner_id,
                category_id
            ) VALUES ($1, $2, $3, $4, $5, $6)",
            &[
                &task.title,
                &task.description,
                &task.is_complete,
                &task.priority,
                &task.owner_id,
                &task.category_id,
            ],
        )
        .await
    {
        Ok(_data) => {
            return HttpResponse::Created()
                .content_type("application/json")
                .json(task);
        }
        Err(err) => {
            return HttpResponse::Conflict()
                .content_type("application/json")
                .json(err.to_string());
        }
    }
}

#[put("/task")]
async fn update_task(_req: HttpRequest, params: web::Json<Task>) -> impl Responder {
    let client = connect_to_db().await;

    let task = Task {
        id: params.id,
        title: params.title.to_owned(),
        description: params.description.to_owned(),
        is_complete: params.is_complete,
        priority: params.priority,
        owner_id: params.owner_id,
        category_id: params.category_id,
    };

    match client
        .execute(
            "UPDATE public.task
            SET title = $1, 
                description = $2, 
                is_complete = $3, 
                priority = $4, 
                owner_id = $5, 
                category_id = $6 
             WHERE id = $7",
            &[
                &task.title,
                &task.description,
                &task.is_complete,
                &task.priority,
                &task.owner_id,
                &task.category_id,
                &task.id,
            ],
        )
        .await
    {
        Ok(_data) => {
            return HttpResponse::Created()
                .content_type("application/json")
                .json(task);
        }
        Err(err) => {
            return HttpResponse::Conflict()
                .content_type("application/json")
                .json(err.to_string());
        }
    }
}

#[put("/tasks")]
async fn update_many_tasks(_req: HttpRequest, params: web::Json<Vec<Task>>) -> impl Responder {
    let client = connect_to_db().await;

    let tasks = params.0;

    for i in 0..tasks.len() {
        let statement = client
            .prepare(
                "UPDATE public.task
                SET title = $1, 
                    description = $2, 
                    is_complete = $3, 
                    priority = $4, 
                    owner_id = $5, 
                    category_id = $6 
                WHERE id = $7",
            )
            .await
            .expect("Could not prepare query.");

        let parsed_task = Task {
            id: tasks[i].id,
            title: tasks[i].title.to_owned(),
            description: tasks[i].description.to_owned(),
            is_complete: tasks[i].is_complete,
            priority: tasks[i].priority,
            owner_id: tasks[i].owner_id,
            category_id: tasks[i].category_id,
        };
        client
            .execute(
                &statement,
                &[
                    &parsed_task.title,
                    &parsed_task.description,
                    &parsed_task.is_complete,
                    &parsed_task.priority,
                    &parsed_task.owner_id,
                    &parsed_task.category_id,
                    &parsed_task.id,
                ],
            )
            .await
            .expect("error executing query");
    }

    return HttpResponse::Ok()
        .content_type("application/json")
        .json("{success: 200}");
}

#[delete("/task/{id}")]
async fn delete_task_by_id(info: Path<InfoPathId>) -> impl Responder {
    let id = info.id;
    let client = connect_to_db().await;

    client
        .execute("DELETE FROM public.task WHERE id=$1", &[&id])
        .await
        .expect("error deleting task");

    return HttpResponse::Ok().json("Deleted Item");
}

#[get("/categories")]
async fn get_categories() -> impl Responder {
    let client = connect_to_db().await;
    let mut categories: Vec<Category> = Vec::new();

    let mut tasks: Vec<Task> = Vec::new();

    for row in client
        .query("SELECT * FROM task", &[])
        .await
        .expect("error getting tasks")
    {
        let task = Task {
            id: row.get(0),
            title: row.get(1),
            description: row.try_get(2).expect("value was null"),
            is_complete: row.get(3),
            priority: row.get(4),
            owner_id: row.get(5),
            category_id: row.get(6),
        };

        tasks.push(task);
    }

    for row in client
        .query("SELECT * FROM category", &[])
        .await
        .expect("error getting categories")
    {
        let cat = Category {
            id: row.get(0),
            title: row.get(1),
            description: row.try_get(2).expect("value was null"),
            priority: row.get(3),
            owner_id: row.get(4),
            tasks_todo: Vec::new(),
            tasks_done: Vec::new(),
        };

        categories.push(cat);
    }

    for i in 0..tasks.len() {
        for x in 0..categories.len() {
            if tasks[i].category_id == categories[x].id {
                let task = tasks.get(i).expect("error");

                if !tasks[i].is_complete {
                    categories[x].tasks_todo.push(task);
                } else {
                    categories[x].tasks_done.push(task);
                }
            }
        }
    }

    return HttpResponse::Ok().json(categories);
}

#[post("/category")]
async fn create_category(_req: HttpRequest, params: web::Json<CategoryRequest>) -> impl Responder {
    let client = connect_to_db().await;

    let cat = CategoryRequest {
        title: params.title.to_owned(),
        description: params.description.to_owned(),
        priority: params.priority,
        owner_id: params.owner_id,
    };

    match client
        .query_one(
            "INSERT INTO public.category (
                title, 
                description, 
                priority, 
                owner_id
            ) VALUES ($1, $2, $3, $4) RETURNING id",
            &[&cat.title, &cat.description, &cat.priority, &cat.owner_id],
        )
        .await
    {
        Ok(data) => {
            let id: i32 = data.get(0);
            return HttpResponse::Created()
                .content_type("application/json")
                .json(id);
        }
        Err(err) => {
            return HttpResponse::ServiceUnavailable()
                .content_type("application/json")
                .json(err.to_string());
        }
    }
}

#[get("/category/{id}")]
async fn get_category_by_id(info: Path<InfoPathId>) -> impl Responder {
    let id = info.id;
    let client = connect_to_db().await;

    let row = client
        .query_one("SELECT * FROM public.category WHERE id=$1", &[&id])
        .await
        .expect("error getting category");

    let cat = Category {
        id: row.get(0),
        title: row.get(1),
        description: row.try_get(2).expect("value was null"),
        priority: row.get(3),
        owner_id: row.get(4),
        tasks_done: Vec::new(),
        tasks_todo: Vec::new(),
    };

    return HttpResponse::Ok().json(cat);
}

#[put("/category/{id}")]
async fn update_category(
    _req: HttpRequest,
    params: web::Json<CategoryRequest>,
    info: Path<InfoPathId>,
) -> impl Responder {
    let client = connect_to_db().await;
    let cat_id = info.id;

    let category = Category {
        id: cat_id,
        title: params.title.to_owned(),
        description: Some(params.description.to_owned()),
        priority: params.priority,
        owner_id: params.owner_id,
        tasks_done: Vec::new(),
        tasks_todo: Vec::new(),
    };

    match client
        .execute(
            "UPDATE public.category
            SET title = $1, 
                description = $2,
                priority = $3, 
                owner_id = $4
             WHERE id = $5",
            &[
                &category.title,
                &category.description,
                &category.priority,
                &category.owner_id,
                &category.id,
            ],
        )
        .await
    {
        Ok(_data) => {
            return HttpResponse::Created()
                .content_type("application/json")
                .json(category);
        }
        Err(err) => {
            return HttpResponse::ServiceUnavailable()
                .content_type("application/json")
                .json(err.to_string());
        }
    }
}

#[delete("/category/{id}")]
async fn delete_category_by_id(info: Path<InfoPathId>) -> impl Responder {
    let id = info.id;
    let client = connect_to_db().await;

    client
        .execute("DELETE FROM public.category WHERE id=$1", &[&id])
        .await
        .expect("error deleting category");

    return HttpResponse::Ok().json("Deleted Item");
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        let cors = Cors::default()
            .allowed_origin("http://localhost:3000")
            .allowed_origin_fn(|origin, _req_head| origin.as_bytes().ends_with(b".rust-lang.org"))
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
            .allowed_headers(vec![http::header::AUTHORIZATION, http::header::ACCEPT])
            .allowed_header(http::header::CONTENT_TYPE)
            .max_age(3600);
        App::new()
            .wrap(cors)
            .service(create_task)
            .service(update_task)
            .service(update_many_tasks)
            .service(get_tasks)
            .service(get_task_by_id)
            .service(delete_task_by_id)
            .service(get_categories)
            .service(get_category_by_id)
            .service(create_category)
            .service(update_category)
            .service(delete_category_by_id)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}

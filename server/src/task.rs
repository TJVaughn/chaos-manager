use crate::connect::connect_to_db;
use actix_web::{
    web::Path,
    web::{self},
    HttpRequest, HttpResponse, Responder,
};
use serde::{Deserialize, Serialize};
// mod connect;
#[derive(Serialize, Deserialize)]
pub struct InfoPathId {
    pub id: i32,
}

#[derive(Serialize, Deserialize)]
pub struct Task {
    pub id: i32,
    pub title: String,
    pub description: Option<String>,
    pub is_complete: bool,
    pub priority: i32,
    pub owner_id: i32,
    pub category_id: i32,
}

#[derive(Serialize, Deserialize)]
pub struct TaskRequest {
    title: String,
    is_complete: bool,
    description: String,
    priority: i32,
    owner_id: i32,
    category_id: i32,
}

// #[get("/tasks")]
pub async fn get_tasks() -> impl Responder {
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

// #[get("/task/{id}")]
pub async fn get_task_by_id(info: Path<InfoPathId>) -> impl Responder {
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

// #[post("/task")]
pub async fn create_task(_req: HttpRequest, params: web::Json<TaskRequest>) -> impl Responder {
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

// #[put("/task")]
pub async fn update_task(_req: HttpRequest, params: web::Json<Task>) -> impl Responder {
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

// #[put("/tasks")]
pub async fn update_many_tasks(_req: HttpRequest, params: web::Json<Vec<Task>>) -> impl Responder {
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

// #[delete("/task/{id}")]
pub async fn delete_task_by_id(info: Path<InfoPathId>) -> impl Responder {
    let id = info.id;
    let client = connect_to_db().await;

    client
        .execute("DELETE FROM public.task WHERE id=$1", &[&id])
        .await
        .expect("error deleting task");

    return HttpResponse::Ok().json("Deleted Item");
}

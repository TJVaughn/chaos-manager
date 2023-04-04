use crate::{connect::connect_to_db, task::Task};
use actix_web::{
    web::Path,
    web::{self},
    HttpRequest, HttpResponse, Responder,
};

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct InfoPathId {
    id: i32,
}

#[derive(Serialize)]
pub struct Category<'a> {
    id: i32,
    title: String,
    description: Option<String>,
    priority: i32,
    owner_id: i32,
    tasks_todo: Vec<&'a Task>,
    tasks_done: Vec<&'a Task>,
}

#[derive(Serialize, Deserialize)]
pub struct CategoryRequest {
    title: String,
    description: String,
    priority: i32,
    owner_id: i32,
}

// #[get("/categories")]
pub async fn get_categories() -> impl Responder {
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
                let task = tasks.get(i).expect("error").to_owned();

                if !tasks[i].is_complete {
                    categories[x].tasks_todo.push(task.to_owned());
                } else {
                    categories[x].tasks_done.push(task.to_owned());
                }
            }
        }
    }

    return HttpResponse::Ok().json(categories);
}

// #[post("/category")]
pub async fn create_category(
    _req: HttpRequest,
    params: web::Json<CategoryRequest>,
) -> impl Responder {
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

// #[get("/category/{id}")]
pub async fn get_category_by_id(info: Path<InfoPathId>) -> impl Responder {
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

// #[put("/category/{id}")]
pub async fn update_category(
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

// #[delete("/category/{id}")]
pub async fn delete_category_by_id(info: Path<InfoPathId>) -> impl Responder {
    let id = info.id;
    let client = connect_to_db().await;

    client
        .execute("DELETE FROM public.category WHERE id=$1", &[&id])
        .await
        .expect("error deleting category");

    return HttpResponse::Ok().json("Deleted Item");
}

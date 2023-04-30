use actix_cors::Cors;
use actix_web::{http, web, App, HttpServer};
mod category;
mod connect;
mod duration;
mod task;

fn routes(app: &mut web::ServiceConfig) {
    app.service(
        web::scope("")
            .service(
                web::resource("tasks")
                    .route(web::get().to(task::get_tasks))
                    .route(web::put().to(task::update_many_tasks)),
            )
            .service(
                web::resource("task")
                    .route(web::post().to(task::create_task))
                    .route(web::put().to(task::update_task)),
            )
            .service(
                web::resource("task/{id}")
                    .route(web::get().to(task::get_task_by_id))
                    .route(web::delete().to(task::delete_task_by_id)),
            )
            .service(web::resource("categories").to(category::get_categories))
            .service(web::resource("category").route(web::post().to(category::create_category)))
            .service(
                web::resource("category/{id}")
                    .route(web::get().to(category::get_category_by_id))
                    .route(web::put().to(category::update_category))
                    .route(web::delete().to(category::delete_category_by_id)),
            )
            .service(
                web::resource("duration")
                    .route(web::post().to(duration::create_duration))
                    .route(web::put().to(duration::update_duration)),
            )
            .service(
                web::resource("duration/{id}")
                    .route(web::get().to(duration::get_duration_by_id)),
            )
            .service(
                web::resource("durations")
                    .route(web::get().to(duration::get_durations)),
            ),
    );
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
        return App::new().wrap(cors).configure(routes);
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}

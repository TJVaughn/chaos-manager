use crate::connect::connect_to_db;
use actix_web::{
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
pub struct Duration {
    pub id: i32,
    pub owner_id: i32,
    pub category_id: i32,
    pub start_hour: i32,
    pub end_hour: i32,
    pub day_as_int: i32,
    pub color: String,
}

#[derive(Serialize, Deserialize)]
pub struct DurationReq {
    owner_id: i32,
    category_id: i32,
    start_hour: i32,
    end_hour: i32,
    day_as_int: i32,
    color: String,
}

// get /durations
pub async fn get_durations() -> impl Responder {
    let client = connect_to_db().await;

    let mut durations: Vec<Duration> = Vec::new();

    for row in client
        .query("SELECT * FROM public.duration", &[])
        .await
        .expect("error getting durations")
    {
        let dur = Duration {
            id: row.get(0),
            owner_id: row.get(1),
            category_id: row.get(2),
            start_hour: row.get(3),
            end_hour: row.get(4),
            day_as_int: row.get(5),
            color: row.get(6),
        };

        durations.push(dur);
    }
    return HttpResponse::Ok().json(durations);
}

// #[post("/durations")]
pub async fn create_many_durations(
    _req: HttpRequest,
    params: web::Json<Vec<DurationReq>>,
) -> impl Responder {
    let client = connect_to_db().await;

    let durations = params.0;

    for i in 0..durations.len() {
        let stmt = client
            .prepare(
                "INSERT INTO public.duration (
                owner_id,
                category_id,
                start_hour,
                end_hour,
                day_as_int,
                color
            ) VALUES ($1, $2, $3, $4, $5, $6)",
            )
            .await
            .expect("error preparing create statement");

        let dur = DurationReq {
            owner_id: durations[i].owner_id,
            category_id: durations[i].category_id,
            start_hour: durations[i].start_hour,
            end_hour: durations[i].end_hour,
            day_as_int: durations[i].day_as_int,
            color: durations[i].color.to_owned(),
        };

        client
            .execute(
                &stmt,
                &[
                    &dur.owner_id,
                    &dur.category_id,
                    &dur.start_hour,
                    &dur.end_hour,
                    &dur.day_as_int,
                    &dur.color,
                ],
            )
            .await
            .expect("Error creating duration");
    }
    return HttpResponse::Ok()
        .content_type("application/json")
        .json("{success: 200}");
}

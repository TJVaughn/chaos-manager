use crate::connect::connect_to_db;
use actix_web::{
    web::{self, Path},
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
    pub recurring_days:Vec<i32>,
    pub color: String,
}

#[derive(Serialize, Deserialize)]
pub struct DurationReq {
    owner_id: i32,
    category_id: i32,
    start_hour: i32,
    end_hour: i32,
    recurring_days: Vec<i32>,
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
            recurring_days: row.get(5),
            color: row.get(6),
        };

        durations.push(dur);
    }
    return HttpResponse::Ok().json(durations);
}

// #[get("/duration/{id}")]
pub async fn get_duration_by_id(info: Path<InfoPathId>) -> impl Responder {
    let id = info.id;
    let client = connect_to_db().await;

    let row = client
        .query_one("SELECT * FROM duration WHERE id=$1", &[&id])
        .await
        .expect("error getting duration");

    let duration= Duration {
        id: row.get(0),
        owner_id: row.get(1),
        category_id: row.get(2),
        start_hour: row.get(3),
        end_hour: row.get(4),
        recurring_days: row.get(5),
        color: row.get(6)
    };

    return HttpResponse::Ok().json(duration);
}


// #[post("/duration")
pub async fn create_duration(
    _req: HttpRequest,
    params: web::Json<DurationReq>,
) -> impl Responder {
    let client = connect_to_db().await;

    let duration = params.0;

    // for i in 0..durations.len() {
        let stmt = client
            .prepare(
                "INSERT INTO public.duration (
                owner_id,
                category_id,
                start_hour,
                end_hour,
                recurring_days,
                color
            ) VALUES ($1, $2, $3, $4, $5, $6)",
            )
            .await
            .expect("error preparing create statement");

        let dur = DurationReq {
            owner_id: duration.owner_id,
            category_id: duration.category_id,
            start_hour: duration.start_hour,
            end_hour: duration.end_hour,
            recurring_days: duration.recurring_days,
            color: duration.color.to_owned(),
        };

        client
            .execute(
                &stmt,
                &[
                    &dur.owner_id,
                    &dur.category_id,
                    &dur.start_hour,
                    &dur.end_hour,
                    &dur.recurring_days,
                    &dur.color,
                ],
            )
            .await
            .expect("Error creating duration");
    //}
    return HttpResponse::Ok()
        .content_type("application/json")
        .json("{success: 200}");
}


// #[put("/duration")]
pub async fn update_duration(_req: HttpRequest, params: web::Json<Duration>) -> impl Responder {
    let client = connect_to_db().await;

    let dur = Duration {
        id: params.id,
        owner_id: params.owner_id,
        category_id: params.category_id,
        start_hour: params.start_hour,
        end_hour: params.end_hour,
        recurring_days: params.recurring_days.to_owned(),
        color: params.color.to_owned(),
    };

    match client
        .execute(
            "UPDATE public.duration
            SET owner_id = $1,
                category_id= $2,
                start_hour= $3,
                end_hour= $4,
                recurring_days= $5,
                color = $6
             WHERE id = $7",
            &[
                &dur.owner_id,
                &dur.category_id,
                &dur.start_hour,
                &dur.end_hour,
                &dur.recurring_days,
                &dur.color,
                &dur.id
            ],
        )
        .await
    {
        Ok(_data) => {
            return HttpResponse::Created()
                .content_type("application/json")
                .json(dur);
        }
        Err(err) => {
            return HttpResponse::Conflict()
                .content_type("application/json")
                .json(err.to_string());
        }
    }
}



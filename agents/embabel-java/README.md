# Embabel GOAP Agent (Java/Kotlin)

> **Phase 3** — Planned for a future implementation session.
> Runs via Docker — `docker-compose --profile java up`

## What is Embabel?

Embabel is Rod Johnson's (Spring Framework creator) JVM-native agent framework.
Released 2025, reaching production stability in 2026.

**Key idea:** borrow **GOAP (Goal-Oriented Action Planning)** from video game AI.
Instead of a fixed graph, Embabel discovers available actions from your Spring beans
and plans the shortest path from the current world state to the goal.

```
Goal: "Plan a trip to Paris with budget $2000"
    ↓
Embabel discovers actions: [research_flights, book_hotel, find_activities, check_budget]
    ↓
Plans: research_flights → check_budget → find_activities → book_hotel
    ↓
Executes, re-plans if any action fails or state changes
```

## Why GOAP for agents?

- **Explainability:** you see exactly why each action was chosen
- **Adaptability:** if the world changes mid-execution, the planner re-plans
- **Type safety:** all actions are typed Spring beans; prompts are typesafe via Kotlin data classes
- **Spring-native:** drop into any Spring Boot app

## Tech stack

```
Embabel 0.3.x
Spring Boot 3.x
Kotlin data classes (for typesafe domain model)
Spring AI ChatClient (→ Groq via OpenAI-compatible)
A2A Java SDK (for agent-to-agent calls)
```

## Demo: Trip Planner

A GOAP agent that plans a trip given a destination and budget:

```kotlin
@Goal("Plan the optimal trip given destination and budget")
data class TripPlan(val destination: String, val budget: Double)

@Action(preconditions = ["flights_researched"], effects = ["flight_booked"])
fun bookFlight(plan: TripPlan): FlightBooking { ... }

@Action(preconditions = ["flight_booked"], effects = ["hotel_booked"])
fun bookHotel(plan: TripPlan, flight: FlightBooking): HotelBooking { ... }
```

Embabel discovers these actions and plans autonomously.

## Quickstart (Phase 3)

```bash
docker-compose --profile java up embabel
# → http://localhost:8081
# → http://localhost:8081/.well-known/agent-card.json
```

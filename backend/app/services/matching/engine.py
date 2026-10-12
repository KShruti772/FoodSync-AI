"""Deterministic FoodSync AI matching engine.

Implements the multi-factor deterministic heuristic matching algorithm
specified in docs/AI_MATCHING.md.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import math
import os
from typing import Any, Dict, List, Optional, Union


EARTH_RADIUS_KM = 6371.0

DEFAULT_WEIGHTS: Dict[str, float] = {
    "distance": 0.35,
    "urgency": 0.30,
    "capacity": 0.20,
    "requirement": 0.15,
}


@dataclass(frozen=True)
class MatchingWeights:
    distance: float = float(
        os.getenv("MATCH_WEIGHT_DISTANCE", "0.35")
    )
    urgency: float = float(
        os.getenv("MATCH_WEIGHT_URGENCY", "0.30")
    )
    capacity: float = float(
        os.getenv("MATCH_WEIGHT_CAPACITY", "0.20")
    )
    requirement: float = float(
        os.getenv("MATCH_WEIGHT_REQUIREMENT", "0.15")
    )

    def validate(self) -> "MatchingWeights":
        """Validate that configured weights are valid."""
        return validate_weights(self)


def haversine_distance_km(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
) -> float:
    """Calculate the great-circle distance between two coordinates."""
    values = (lat1, lng1, lat2, lng2)

    if not all(math.isfinite(value) for value in values):
        raise ValueError("Coordinates must be finite numbers.")

    if not (-90 <= lat1 <= 90 and -90 <= lat2 <= 90):
        raise ValueError("Latitude must be between -90 and 90.")

    if not (-180 <= lng1 <= 180 and -180 <= lng2 <= 180):
        raise ValueError("Longitude must be between -180 and 180.")

    lat1, lng1, lat2, lng2 = map(
        math.radians, (lat1, lng1, lat2, lng2)
    )

    dlat = lat2 - lat1
    dlng = lng2 - lng1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlng / 2) ** 2
    )

    # Protect against floating-point rounding.
    a = min(1.0, max(0.0, a))

    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def urgency_score(expiry_time: datetime, current_time: datetime) -> float:
    """Score remaining shelf life according to AI_MATCHING.md."""
    if expiry_time.tzinfo is None or current_time.tzinfo is None:
        raise ValueError("Expiry and current times must be timezone-aware.")

    remaining = (expiry_time - current_time).total_seconds() / 60

    if remaining < 30:
        return 0.0
    if remaining <= 120:
        return 1.0
    if remaining <= 360:
        return 0.8
    if remaining <= 1440:
        return 0.5
    return 0.3


def capacity_score(quantity_meals: float, daily_capacity_meals: float) -> float:
    """Calculate donation-to-recipient capacity compatibility."""
    if quantity_meals <= 0:
        raise ValueError("Donation quantity must be positive.")

    if daily_capacity_meals <= 0:
        raise ValueError("Recipient daily capacity must be positive.")

    if quantity_meals <= daily_capacity_meals:
        if quantity_meals >= 0.5 * daily_capacity_meals:
            return 1.0
        return quantity_meals / (0.5 * daily_capacity_meals)

    return max(
        0.0,
        1.0 - (quantity_meals - daily_capacity_meals) / daily_capacity_meals,
    )


def dietary_compatible(food_type: str, dietary_preference: str) -> bool:
    """Check whether a donation satisfies recipient dietary preferences."""
    food_type = food_type.upper()
    dietary_preference = dietary_preference.upper()

    if dietary_preference == "ALL":
        return True

    if dietary_preference == "VEGETARIAN_ONLY":
        return food_type in {
            "VEGETARIAN_COOKED",
            "PACKAGED_GROCERY",
            "PRODUCE_RAW",
            "BAKERY",
        }

    if dietary_preference == "VEGAN_ONLY":
        return food_type in {
            "PRODUCE_RAW",
            "VEGAN_COOKED",
        }

    return False


def storage_compatible(
    perishable: bool,
    storage_types: List[str],
) -> bool:
    """Check whether the recipient can safely store the donation."""
    if not perishable:
        return True

    normalized_storage = {
        storage.upper() for storage in storage_types
    }

    return bool(
        normalized_storage & {"REFRIGERATED", "FROZEN"}
    )


def distance_score(
    distance_km: float,
    recipient_max_travel_distance_km: float,
    system_max_radius_km: float = 15.0,
) -> Optional[float]:
    """Return the normalized distance score, or None if out of range."""
    if recipient_max_travel_distance_km <= 0 or system_max_radius_km <= 0:
        raise ValueError("Travel distances must be positive.")

    effective_radius = min(
        system_max_radius_km,
        recipient_max_travel_distance_km,
    )

    if distance_km < 0:
        raise ValueError("Distance cannot be negative.")

    if distance_km > effective_radius:
        return None

    return 1.0 - distance_km / effective_radius


def validate_weights(
    weights: Optional[Union[MatchingWeights, Dict[str, float]]] = None,
) -> MatchingWeights:
    """Validate that matching weights are non-negative, finite, and sum to 1.0.

    Args:
        weights: A MatchingWeights instance, a dict of weights, or None (defaults to MatchingWeights()).

    Returns:
        A validated MatchingWeights instance.

    Raises:
        ValueError: If any weight is outside [0.0, 1.0], not finite, or weights do not sum to 1.0.
        TypeError: If weights is of an unsupported type.
    """
    if weights is None:
        weights = MatchingWeights()

    if isinstance(weights, dict):
        required_keys = {"distance", "urgency", "capacity", "requirement"}
        missing = required_keys - set(weights.keys())
        if missing:
            raise ValueError(f"Missing required weight keys: {sorted(missing)}")
        weights = MatchingWeights(
            distance=float(weights["distance"]),
            urgency=float(weights["urgency"]),
            capacity=float(weights["capacity"]),
            requirement=float(weights["requirement"]),
        )
    elif not isinstance(weights, MatchingWeights):
        raise TypeError(
            f"weights must be an instance of MatchingWeights, dict, or None; got {type(weights).__name__}"
        )

    for field_name in ("distance", "urgency", "capacity", "requirement"):
        val = getattr(weights, field_name)
        if not isinstance(val, (int, float)) or not math.isfinite(val):
            raise ValueError(
                f"Weight '{field_name}' must be a finite number, got {val}"
            )
        if val < 0.0 or val > 1.0:
            raise ValueError(
                f"Weight '{field_name}' must be between 0.0 and 1.0, got {val}"
            )

    total = (
        weights.distance
        + weights.urgency
        + weights.capacity
        + weights.requirement
    )
    if not math.isclose(total, 1.0, rel_tol=1e-5, abs_tol=1e-5):
        raise ValueError(
            f"Matching weights must sum to 1.0 (got {total:.4f})."
        )

    return weights


def validate_score(
    score: Optional[float],
    score_name: str,
    allow_none: bool = False,
) -> None:
    """Validate that an individual factor score is a finite float in [0.0, 1.0].

    Args:
        score: The score to validate.
        score_name: Name of the score for error reporting.
        allow_none: Whether None is permissible (e.g. for distance when disqualified).

    Raises:
        ValueError: If the score is invalid or outside [0.0, 1.0].
    """
    if score is None:
        if allow_none:
            return
        raise ValueError(f"{score_name} cannot be None.")

    if not isinstance(score, (int, float)) or not math.isfinite(score):
        raise ValueError(f"{score_name} must be a finite number, got {score}")

    if score < 0.0 or score > 1.0:
        raise ValueError(f"{score_name} must be between 0.0 and 1.0, got {score}")


@dataclass(frozen=True)
class FactorScore:
    """Details and breakdown of an individual matching factor."""

    name: str
    raw_score: Optional[float]
    weight: float
    weighted_score: float
    is_disqualified: bool = False
    disqualification_reason: Optional[str] = None
    description: str = ""

    @property
    def score(self) -> Optional[float]:
        """Convenience alias for raw_score."""
        return self.raw_score

    def to_dict(self) -> Dict[str, Any]:
        """Serialize factor score details to a dictionary."""
        return {
            "name": self.name,
            "raw_score": self.raw_score,
            "score": self.raw_score,
            "weight": self.weight,
            "weighted_score": self.weighted_score,
            "is_disqualified": self.is_disqualified,
            "disqualification_reason": self.disqualification_reason,
            "description": self.description,
        }


@dataclass(frozen=True)
class MatchScoreResult:
    """Complete match evaluation result, factor breakdown, and qualification status."""

    is_qualified: bool
    total_score: float
    factors: Dict[str, FactorScore]
    weights: MatchingWeights
    disqualification_reason: Optional[str] = None
    explanation: str = ""

    @property
    def score(self) -> float:
        """Convenience alias for total_score."""
        return self.total_score

    @property
    def matched_factors(self) -> Dict[str, Optional[float]]:
        """Return factor scores conforming to docs/AI_MATCHING.md API contract."""
        dist = self.factors.get("distance")
        urg = self.factors.get("urgency")
        cap = self.factors.get("capacity")
        req = self.factors.get("requirement")
        return {
            "distance_score": dist.raw_score if dist else None,
            "urgency_score": urg.raw_score if urg else None,
            "capacity_fit_score": cap.raw_score if cap else None,
            "dietary_preference_score": req.raw_score if req else None,
        }

    @property
    def breakdown(self) -> Dict[str, Dict[str, Any]]:
        """Return factor breakdowns as nested dictionaries."""
        return {name: factor.to_dict() for name, factor in self.factors.items()}

    def to_dict(self) -> Dict[str, Any]:
        """Serialize complete match result to a dictionary."""
        return {
            "is_qualified": self.is_qualified,
            "total_score": self.total_score,
            "score": self.total_score,
            "disqualification_reason": self.disqualification_reason,
            "explanation": self.explanation,
            "matched_factors": self.matched_factors,
            "breakdown": self.breakdown,
        }

    def __getitem__(self, item: str) -> Any:
        """Allow dictionary-style access (e.g. result['total_score'])."""
        return self.to_dict()[item]

    def get(self, item: str, default: Any = None) -> Any:
        """Allow dictionary-style get access."""
        return self.to_dict().get(item, default)


def calculate_match_score(
    distance_score: Optional[float],
    urgency_score: Optional[float],
    capacity_score: Optional[float],
    requirement_score: Optional[float] = 1.0,
    weights: Optional[Union[MatchingWeights, Dict[str, float]]] = None,
    disqualify_zero_urgency: bool = True,
) -> MatchScoreResult:
    """Calculate the weighted total match score with factor breakdown and disqualification handling.

    Mathematical Framework:
        S_total = w_dist * S_dist + w_urg * S_urg + w_cap * S_cap + w_req * S_req

    Default Configured Weights:
        w_dist = 0.35, w_urg = 0.30, w_cap = 0.20, w_req = 0.15 (sum = 1.00)

    Disqualification Rules:
        - Candidate outside permitted travel radius (distance_score is None) -> Disqualified.
        - Expiry under 30 minutes (urgency_score == 0.0 or None) -> Disqualified.
        - Incompatible requirements (requirement_score == 0.0) -> Disqualified.
        Disqualified candidates receive is_qualified = False and total_score = 0.0,
        rather than merely receiving a low partial score.

    Args:
        distance_score: Proximity score in [0.0, 1.0], or None if outside permitted radius.
        urgency_score: Shelf-life urgency score in [0.0, 1.0], or None.
        capacity_score: Capacity utilization score in [0.0, 1.0].
        requirement_score: Requirement score in [0.0, 1.0] (default: 1.0).
        weights: Optional MatchingWeights or weights dict.
        disqualify_zero_urgency: If True (default), urgency_score == 0.0 (<30 min remaining)
            disqualifies candidate.

    Returns:
        MatchScoreResult containing qualification status, total score, and explainable breakdown.

    Raises:
        ValueError: If scores or weights are outside valid ranges or non-finite.
    """
    validated_weights = validate_weights(weights)

    validate_score(distance_score, "distance_score", allow_none=True)
    validate_score(urgency_score, "urgency_score", allow_none=True)
    validate_score(capacity_score, "capacity_score", allow_none=False)
    validate_score(requirement_score, "requirement_score", allow_none=False)

    disqualification_reasons: List[str] = []

    # 1. Distance disqualification check (candidate outside travel radius)
    dist_disqualified = distance_score is None
    if dist_disqualified:
        disqualification_reasons.append(
            "Candidate is outside permitted travel radius (distance exceeds effective radius)"
        )

    # 2. Urgency disqualification check (remaining shelf life < 30 minutes)
    urg_disqualified = urgency_score is None or (
        disqualify_zero_urgency and urgency_score == 0.0
    )
    if urg_disqualified:
        disqualification_reasons.append(
            "Remaining shelf life is under 30 minutes (insufficient transport window)"
        )

    # 3. Requirement disqualification check (dietary or storage constraints not met)
    req_disqualified = requirement_score == 0.0
    if req_disqualified:
        disqualification_reasons.append(
            "Requirement constraints incompatible (dietary preference or storage mismatch)"
        )

    is_qualified = len(disqualification_reasons) == 0

    # Build factor breakdowns
    weighted_dist = (
        0.0
        if dist_disqualified
        else round(float(distance_score) * validated_weights.distance, 4)
    )
    dist_desc = (
        "Outside permitted travel radius"
        if dist_disqualified
        else f"Proximity score {distance_score:.2f} (weight {validated_weights.distance:.2f})"
    )
    dist_factor = FactorScore(
        name="distance",
        raw_score=distance_score,
        weight=validated_weights.distance,
        weighted_score=weighted_dist,
        is_disqualified=dist_disqualified,
        disqualification_reason=(
            "Distance exceeds effective radius limit"
            if dist_disqualified
            else None
        ),
        description=dist_desc,
    )

    weighted_urg = (
        0.0
        if urg_disqualified
        else round(float(urgency_score) * validated_weights.urgency, 4)
    )
    urg_desc = (
        "Shelf life under 30 minutes (insufficient transport time)"
        if urg_disqualified
        else f"Urgency score {urgency_score:.2f} (weight {validated_weights.urgency:.2f})"
    )
    urg_factor = FactorScore(
        name="urgency",
        raw_score=urgency_score,
        weight=validated_weights.urgency,
        weighted_score=weighted_urg,
        is_disqualified=urg_disqualified,
        disqualification_reason=(
            "Expiry under 30 minutes"
            if urg_disqualified
            else None
        ),
        description=urg_desc,
    )

    weighted_cap = round(float(capacity_score) * validated_weights.capacity, 4)
    cap_desc = (
        f"Capacity fit score {capacity_score:.2f} (weight {validated_weights.capacity:.2f})"
    )
    cap_factor = FactorScore(
        name="capacity",
        raw_score=capacity_score,
        weight=validated_weights.capacity,
        weighted_score=weighted_cap,
        is_disqualified=False,
        disqualification_reason=None,
        description=cap_desc,
    )

    weighted_req = (
        0.0
        if req_disqualified
        else round(float(requirement_score) * validated_weights.requirement, 4)
    )
    req_desc = (
        "Requirement incompatible"
        if req_disqualified
        else f"Requirement score {requirement_score:.2f} (weight {validated_weights.requirement:.2f})"
    )
    req_factor = FactorScore(
        name="requirement",
        raw_score=requirement_score,
        weight=validated_weights.requirement,
        weighted_score=weighted_req,
        is_disqualified=req_disqualified,
        disqualification_reason=(
            "Dietary or storage constraints not met"
            if req_disqualified
            else None
        ),
        description=req_desc,
    )

    factors = {
        "distance": dist_factor,
        "urgency": urg_factor,
        "capacity": cap_factor,
        "requirement": req_factor,
    }

    if not is_qualified:
        combined_reason = "; ".join(disqualification_reasons)
        explanation = f"Candidate disqualified: {combined_reason}."
        return MatchScoreResult(
            is_qualified=False,
            total_score=0.0,
            factors=factors,
            weights=validated_weights,
            disqualification_reason=combined_reason,
            explanation=explanation,
        )

    raw_total = (
        float(distance_score) * validated_weights.distance
        + float(urgency_score) * validated_weights.urgency
        + float(capacity_score) * validated_weights.capacity
        + float(requirement_score) * validated_weights.requirement
    )
    total_score = round(raw_total, 4)

    explanation = (
        f"Qualified candidate with total compatibility score {total_score:.4f} "
        f"(distance: {distance_score:.2f} * {validated_weights.distance:.2f} = {weighted_dist:.4f}, "
        f"urgency: {urgency_score:.2f} * {validated_weights.urgency:.2f} = {weighted_urg:.4f}, "
        f"capacity: {capacity_score:.2f} * {validated_weights.capacity:.2f} = {weighted_cap:.4f}, "
        f"requirement: {requirement_score:.2f} * {validated_weights.requirement:.2f} = {weighted_req:.4f})."
    )

    return MatchScoreResult(
        is_qualified=True,
        total_score=total_score,
        factors=factors,
        weights=validated_weights,
        disqualification_reason=None,
        explanation=explanation,
    )


# Function aliases for flexible integration
calculate_weighted_score = calculate_match_score
calculate_weighted_match_score = calculate_match_score
calculate_weighted_total_match_score = calculate_match_score


def evaluate_candidate_match(
    distance_km: float,
    recipient_max_travel_distance_km: float,
    quantity_meals: float,
    daily_capacity_meals: float,
    expiry_time: datetime,
    current_time: datetime,
    food_type: str,
    dietary_preference: str,
    perishable: bool,
    storage_types: List[str],
    weights: Optional[Union[MatchingWeights, Dict[str, float]]] = None,
    system_max_radius_km: float = 15.0,
) -> MatchScoreResult:
    """Evaluate end-to-end candidate compatibility from raw donation and recipient attributes.

    Integrates Haversine distance, shelf-life urgency, capacity fit, dietary compatibility,
    and storage constraints, computing the weighted match score or disqualifying candidate.

    Args:
        distance_km: Distance between donor and recipient in km.
        recipient_max_travel_distance_km: Recipient's maximum travel limit.
        quantity_meals: Donation meal quantity.
        daily_capacity_meals: Recipient's daily meal capacity.
        expiry_time: Donation expiry timestamp (timezone-aware).
        current_time: Current timestamp (timezone-aware).
        food_type: Food category string (e.g. 'VEGETARIAN_COOKED').
        dietary_preference: Recipient dietary preference (e.g. 'VEGETARIAN_ONLY').
        perishable: True if donation requires temperature control.
        storage_types: List of storage capabilities of the recipient.
        weights: Optional MatchingWeights or weights dict.
        system_max_radius_km: System radius ceiling in km (default: 15.0).

    Returns:
        MatchScoreResult with qualification status, score, and detailed breakdown.
    """
    s_dist = distance_score(
        distance_km=distance_km,
        recipient_max_travel_distance_km=recipient_max_travel_distance_km,
        system_max_radius_km=system_max_radius_km,
    )

    s_urg = urgency_score(
        expiry_time=expiry_time,
        current_time=current_time,
    )

    s_cap = capacity_score(
        quantity_meals=quantity_meals,
        daily_capacity_meals=daily_capacity_meals,
    )

    dietary_ok = dietary_compatible(
        food_type=food_type,
        dietary_preference=dietary_preference,
    )

    storage_ok = storage_compatible(
        perishable=perishable,
        storage_types=storage_types,
    )

    s_req = 1.0 if (dietary_ok and storage_ok) else 0.0

    result = calculate_match_score(
        distance_score=s_dist,
        urgency_score=s_urg,
        capacity_score=s_cap,
        requirement_score=s_req,
        weights=weights,
    )

    # Enrich disqualification reason with specific details if applicable
    if not (dietary_ok and storage_ok):
        reasons: List[str] = []
        if result.disqualification_reason:
            reasons.append(result.disqualification_reason)
        if not dietary_ok:
            reasons.append(
                f"Dietary mismatch: donation '{food_type}' incompatible with '{dietary_preference}'"
            )
        if not storage_ok:
            reasons.append(
                f"Storage mismatch: perishable donation requires REFRIGERATED or FROZEN storage; recipient has {storage_types}"
            )
        combined = "; ".join(reasons)
        return MatchScoreResult(
            is_qualified=False,
            total_score=0.0,
            factors=result.factors,
            weights=result.weights,
            disqualification_reason=combined,
            explanation=f"Candidate disqualified: {combined}.",
        )

    return result

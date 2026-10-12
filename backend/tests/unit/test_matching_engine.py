"""Focused unit tests for FoodSync-AI matching engine.

Validates:
1. Valid scores calculation with default and custom configured weights.
2. Factor breakdown and explainable output structure.
3. Invalid weights validation (weights sum != 1.0, negative weights, non-finite).
4. Invalid score inputs validation (<0.0, >1.0, non-finite, None when disallowed).
5. Candidate disqualification (outside radius, expiry <30 min, requirement failure).
6. Preserved functions and deterministic AI_MATCHING.md test matrix.
"""

from datetime import datetime, timedelta, timezone
import math
import unittest

try:
    from backend.app.services.matching.engine import (
        DEFAULT_WEIGHTS,
        EARTH_RADIUS_KM,
        FactorScore,
        MatchingWeights,
        MatchScoreResult,
        calculate_match_score,
        calculate_weighted_match_score,
        calculate_weighted_score,
        calculate_weighted_total_match_score,
        capacity_score,
        dietary_compatible,
        distance_score,
        evaluate_candidate_match,
        haversine_distance_km,
        storage_compatible,
        urgency_score,
        validate_score,
        validate_weights,
    )
except ImportError:
    from app.services.matching.engine import (
        DEFAULT_WEIGHTS,
        EARTH_RADIUS_KM,
        FactorScore,
        MatchingWeights,
        MatchScoreResult,
        calculate_match_score,
        calculate_weighted_match_score,
        calculate_weighted_score,
        calculate_weighted_total_match_score,
        capacity_score,
        dietary_compatible,
        distance_score,
        evaluate_candidate_match,
        haversine_distance_km,
        storage_compatible,
        urgency_score,
        validate_score,
        validate_weights,
    )


class TestWeightsValidation(unittest.TestCase):
    """Test validation of configured weights."""

    def test_default_weights_are_valid(self):
        """Default configured weights (0.35, 0.30, 0.20, 0.15) must validate successfully."""
        weights = MatchingWeights()
        validated = validate_weights(weights)
        self.assertIsInstance(validated, MatchingWeights)
        self.assertEqual(validated.distance, 0.35)
        self.assertEqual(validated.urgency, 0.30)
        self.assertEqual(validated.capacity, 0.20)
        self.assertEqual(validated.requirement, 0.15)
        self.assertAlmostEqual(
            validated.distance + validated.urgency + validated.capacity + validated.requirement,
            1.00,
        )

    def test_valid_custom_weights(self):
        """Custom valid weights summing to 1.0 must pass validation."""
        custom = MatchingWeights(distance=0.40, urgency=0.30, capacity=0.20, requirement=0.10)
        validated = validate_weights(custom)
        self.assertEqual(validated.distance, 0.40)
        self.assertEqual(validated.requirement, 0.10)

    def test_valid_dict_weights(self):
        """Weights provided as a dictionary must pass validation."""
        weight_dict = {
            "distance": 0.25,
            "urgency": 0.25,
            "capacity": 0.25,
            "requirement": 0.25,
        }
        validated = validate_weights(weight_dict)
        self.assertEqual(validated.distance, 0.25)
        self.assertEqual(validated.urgency, 0.25)

    def test_invalid_weights_sum_greater_than_one(self):
        """Weights summing to > 1.0 must raise ValueError."""
        invalid = MatchingWeights(distance=0.40, urgency=0.40, capacity=0.30, requirement=0.10)
        with self.assertRaises(ValueError) as ctx:
            validate_weights(invalid)
        self.assertIn("must sum to 1.0", str(ctx.exception))

    def test_invalid_weights_sum_less_than_one(self):
        """Weights summing to < 1.0 must raise ValueError."""
        invalid = MatchingWeights(distance=0.20, urgency=0.20, capacity=0.20, requirement=0.20)
        with self.assertRaises(ValueError) as ctx:
            validate_weights(invalid)
        self.assertIn("must sum to 1.0", str(ctx.exception))

    def test_negative_weight_raises(self):
        """Negative weight values must raise ValueError."""
        invalid = MatchingWeights(distance=-0.10, urgency=0.50, capacity=0.30, requirement=0.30)
        with self.assertRaises(ValueError) as ctx:
            validate_weights(invalid)
        self.assertIn("between 0.0 and 1.0", str(ctx.exception))

    def test_weight_greater_than_one_raises(self):
        """A weight greater than 1.0 must raise ValueError."""
        invalid = MatchingWeights(distance=1.20, urgency=0.0, capacity=0.0, requirement=-0.20)
        with self.assertRaises(ValueError) as ctx:
            validate_weights(invalid)

    def test_non_finite_weight_raises(self):
        """NaN or Inf weight values must raise ValueError."""
        invalid_nan = MatchingWeights(distance=float("nan"), urgency=0.30, capacity=0.20, requirement=0.15)
        with self.assertRaises(ValueError):
            validate_weights(invalid_nan)

        invalid_inf = MatchingWeights(distance=float("inf"), urgency=0.30, capacity=0.20, requirement=0.15)
        with self.assertRaises(ValueError):
            validate_weights(invalid_inf)

    def test_missing_dict_keys_raises(self):
        """Dictionary missing any required weight key must raise ValueError."""
        with self.assertRaises(ValueError) as ctx:
            validate_weights({"distance": 0.50, "urgency": 0.50})
        self.assertIn("Missing required weight keys", str(ctx.exception))

    def test_invalid_weights_type_raises(self):
        """Passing an unsupported type for weights must raise TypeError."""
        with self.assertRaises(TypeError):
            validate_weights("not-weights")


class TestScoreValidation(unittest.TestCase):
    """Test validation of factor scores."""

    def test_valid_scores_pass(self):
        """Scores in [0.0, 1.0] must pass validation."""
        validate_score(0.0, "score")
        validate_score(0.5, "score")
        validate_score(1.0, "score")

    def test_negative_score_raises(self):
        """Score < 0.0 must raise ValueError."""
        with self.assertRaises(ValueError) as ctx:
            validate_score(-0.01, "distance_score")
        self.assertIn("between 0.0 and 1.0", str(ctx.exception))

    def test_score_above_one_raises(self):
        """Score > 1.0 must raise ValueError."""
        with self.assertRaises(ValueError) as ctx:
            validate_score(1.01, "urgency_score")
        self.assertIn("between 0.0 and 1.0", str(ctx.exception))

    def test_none_disallowed_raises(self):
        """None value when allow_none=False must raise ValueError."""
        with self.assertRaises(ValueError) as ctx:
            validate_score(None, "capacity_score", allow_none=False)
        self.assertIn("cannot be None", str(ctx.exception))

    def test_none_allowed_passes(self):
        """None value when allow_none=True must pass (used for distance out of radius)."""
        validate_score(None, "distance_score", allow_none=True)

    def test_non_finite_score_raises(self):
        """NaN or Inf score must raise ValueError."""
        with self.assertRaises(ValueError):
            validate_score(float("nan"), "capacity_score")
        with self.assertRaises(ValueError):
            validate_score(float("inf"), "requirement_score")


class TestCalculateMatchScore(unittest.TestCase):
    """Test weighted score calculation and factor breakdown."""

    def test_perfect_match_score(self):
        """All factors at 1.0 must yield total match score 1.0000."""
        result = calculate_match_score(
            distance_score=1.0,
            urgency_score=1.0,
            capacity_score=1.0,
            requirement_score=1.0,
        )
        self.assertTrue(result.is_qualified)
        self.assertEqual(result.total_score, 1.0000)
        self.assertIsNone(result.disqualification_reason)

    def test_weighted_formula_calculation(self):
        """Calculates 0.35*dist + 0.30*urg + 0.20*cap + 0.15*req correctly."""
        # dist=0.8 (0.35*0.8 = 0.28)
        # urg=1.0  (0.30*1.0 = 0.30)
        # cap=0.5  (0.20*0.5 = 0.10)
        # req=1.0  (0.15*1.0 = 0.15)
        # sum = 0.28 + 0.30 + 0.10 + 0.15 = 0.83
        result = calculate_match_score(
            distance_score=0.8,
            urgency_score=1.0,
            capacity_score=0.5,
            requirement_score=1.0,
        )
        self.assertTrue(result.is_qualified)
        self.assertAlmostEqual(result.total_score, 0.83, places=4)

    def test_matched_factors_api_contract(self):
        """Verify matched_factors dictionary matches the docs/AI_MATCHING.md specification."""
        result = calculate_match_score(
            distance_score=0.84,
            urgency_score=1.00,
            capacity_score=1.00,
            requirement_score=1.00,
        )
        factors = result.matched_factors
        self.assertEqual(factors["distance_score"], 0.84)
        self.assertEqual(factors["urgency_score"], 1.00)
        self.assertEqual(factors["capacity_fit_score"], 1.00)
        self.assertEqual(factors["dietary_preference_score"], 1.00)

    def test_breakdown_structure_and_explainability(self):
        """Verify explainable breakdown for each individual factor."""
        result = calculate_match_score(
            distance_score=0.6,
            urgency_score=0.8,
            capacity_score=0.5,
            requirement_score=1.0,
        )
        self.assertTrue(result.is_qualified)
        self.assertIn("distance", result.factors)
        self.assertIn("urgency", result.factors)
        self.assertIn("capacity", result.factors)
        self.assertIn("requirement", result.factors)

        dist_f = result.factors["distance"]
        self.assertEqual(dist_f.raw_score, 0.6)
        self.assertEqual(dist_f.weight, 0.35)
        self.assertAlmostEqual(dist_f.weighted_score, 0.21, places=4)
        self.assertFalse(dist_f.is_disqualified)

        # Check human-readable explanation
        self.assertTrue(len(result.explanation) > 0)
        self.assertIn("0.35", result.explanation)
        self.assertIn("0.30", result.explanation)

    def test_dict_style_access(self):
        """Result should support dict indexing for convenient usage."""
        result = calculate_match_score(
            distance_score=1.0,
            urgency_score=1.0,
            capacity_score=1.0,
            requirement_score=1.0,
        )
        self.assertEqual(result["total_score"], 1.0)
        self.assertTrue(result["is_qualified"])
        self.assertIn("breakdown", result.to_dict())

    def test_custom_weights_application(self):
        """Verify calculations adapt when custom weights are provided."""
        custom_weights = MatchingWeights(
            distance=0.50,
            urgency=0.20,
            capacity=0.20,
            requirement=0.10,
        )
        # dist=0.6 (0.50*0.6 = 0.30)
        # urg=1.0  (0.20*1.0 = 0.20)
        # cap=1.0  (0.20*1.0 = 0.20)
        # req=1.0  (0.10*1.0 = 0.10)
        # total = 0.80
        result = calculate_match_score(
            distance_score=0.6,
            urgency_score=1.0,
            capacity_score=1.0,
            requirement_score=1.0,
            weights=custom_weights,
        )
        self.assertEqual(result.total_score, 0.80)

    def test_aliases_work(self):
        """calculate_weighted_score, calculate_weighted_match_score aliases must work."""
        r1 = calculate_weighted_score(1.0, 1.0, 1.0, 1.0)
        r2 = calculate_weighted_match_score(1.0, 1.0, 1.0, 1.0)
        r3 = calculate_weighted_total_match_score(1.0, 1.0, 1.0, 1.0)
        self.assertEqual(r1.total_score, r2.total_score)
        self.assertEqual(r2.total_score, r3.total_score)


class TestCandidateDisqualification(unittest.TestCase):
    """Test hard-disqualification logic for out-of-radius, expiry < 30m, and requirements."""

    def test_outside_permitted_radius_is_disqualified(self):
        """Candidate outside travel radius (distance_score is None) must be disqualified with total_score 0.0."""
        # If naive calculation was used, candidate would get 0.30*1 + 0.20*1 + 0.15*1 = 0.65!
        result = calculate_match_score(
            distance_score=None,
            urgency_score=1.0,
            capacity_score=1.0,
            requirement_score=1.0,
        )
        self.assertFalse(result.is_qualified)
        self.assertEqual(result.total_score, 0.0)
        self.assertIsNotNone(result.disqualification_reason)
        self.assertIn("travel radius", result.disqualification_reason)
        self.assertTrue(result.factors["distance"].is_disqualified)

    def test_expiry_under_30_minutes_is_disqualified(self):
        """Candidate with urgency_score == 0.0 (<30m remaining) must be disqualified with total_score 0.0."""
        # If naive calculation was used, candidate would get 0.35*1 + 0 + 0.20*1 + 0.15*1 = 0.70!
        result = calculate_match_score(
            distance_score=1.0,
            urgency_score=0.0,
            capacity_score=1.0,
            requirement_score=1.0,
        )
        self.assertFalse(result.is_qualified)
        self.assertEqual(result.total_score, 0.0)
        self.assertIsNotNone(result.disqualification_reason)
        self.assertIn("30 minutes", result.disqualification_reason)
        self.assertTrue(result.factors["urgency"].is_disqualified)

    def test_none_urgency_score_is_disqualified(self):
        """urgency_score of None must disqualify the candidate."""
        result = calculate_match_score(
            distance_score=1.0,
            urgency_score=None,
            capacity_score=1.0,
            requirement_score=1.0,
        )
        self.assertFalse(result.is_qualified)
        self.assertEqual(result.total_score, 0.0)

    def test_requirement_score_zero_is_disqualified(self):
        """requirement_score of 0.0 (incompatible dietary or storage) must disqualify."""
        result = calculate_match_score(
            distance_score=1.0,
            urgency_score=1.0,
            capacity_score=1.0,
            requirement_score=0.0,
        )
        self.assertFalse(result.is_qualified)
        self.assertEqual(result.total_score, 0.0)
        self.assertIn("Requirement constraints incompatible", result.disqualification_reason)

    def test_multiple_disqualifications_captured(self):
        """Both distance out-of-radius and urgency < 30m must be reported in disqualification_reason."""
        result = calculate_match_score(
            distance_score=None,
            urgency_score=0.0,
            capacity_score=1.0,
            requirement_score=1.0,
        )
        self.assertFalse(result.is_qualified)
        self.assertEqual(result.total_score, 0.0)
        self.assertIn("travel radius", result.disqualification_reason)
        self.assertIn("30 minutes", result.disqualification_reason)


class TestPreservedExistingFunctions(unittest.TestCase):
    """Verify that all existing functions in engine.py remain intact and correct."""

    def test_haversine_distance(self):
        """haversine_distance_km computes expected distance and validates ranges."""
        self.assertEqual(haversine_distance_km(0.0, 0.0, 0.0, 0.0), 0.0)
        # Invalid coordinates
        with self.assertRaises(ValueError):
            haversine_distance_km(95.0, 0.0, 0.0, 0.0)
        with self.assertRaises(ValueError):
            haversine_distance_km(0.0, 190.0, 0.0, 0.0)

    def test_urgency_score_thresholds(self):
        """urgency_score respects all documented thresholds in docs/AI_MATCHING.md."""
        now = datetime.now(timezone.utc)

        # < 30 min -> 0.0
        self.assertEqual(urgency_score(now + timedelta(minutes=20), now), 0.0)
        # <= 120 min -> 1.0
        self.assertEqual(urgency_score(now + timedelta(minutes=60), now), 1.0)
        # <= 360 min -> 0.8
        self.assertEqual(urgency_score(now + timedelta(minutes=240), now), 0.8)
        # <= 1440 min -> 0.5
        self.assertEqual(urgency_score(now + timedelta(minutes=720), now), 0.5)
        # > 1440 min -> 0.3
        self.assertEqual(urgency_score(now + timedelta(minutes=2000), now), 0.3)

    def test_capacity_score_curves(self):
        """capacity_score handles under-capacity, ideal fit, and overrun."""
        # 50% - 100% capacity -> 1.0
        self.assertEqual(capacity_score(50, 100), 1.0)
        self.assertEqual(capacity_score(100, 100), 1.0)
        # Under-capacity (< 50%)
        self.assertEqual(capacity_score(25, 100), 0.5)
        # Overrun (> 100%)
        self.assertEqual(capacity_score(150, 100), 0.5)
        self.assertEqual(capacity_score(200, 100), 0.0)

    def test_dietary_compatibility(self):
        """dietary_compatible validates ALL, VEGETARIAN_ONLY, and VEGAN_ONLY."""
        self.assertTrue(dietary_compatible("NON_VEGETARIAN_COOKED", "ALL"))
        self.assertTrue(dietary_compatible("VEGETARIAN_COOKED", "VEGETARIAN_ONLY"))
        self.assertFalse(dietary_compatible("NON_VEGETARIAN_COOKED", "VEGETARIAN_ONLY"))
        self.assertTrue(dietary_compatible("PRODUCE_RAW", "VEGAN_ONLY"))
        self.assertFalse(dietary_compatible("BAKERY", "VEGAN_ONLY"))

    def test_storage_compatibility(self):
        """storage_compatible checks perishable requirements."""
        self.assertTrue(storage_compatible(False, ["DRY"]))
        self.assertFalse(storage_compatible(True, ["DRY"]))
        self.assertTrue(storage_compatible(True, ["REFRIGERATED"]))
        self.assertTrue(storage_compatible(True, ["FROZEN"]))

    def test_distance_score_behavior(self):
        """distance_score matches all requirements from prompt and docs."""
        self.assertEqual(distance_score(0, 15), 1.0)
        self.assertEqual(distance_score(15, 15), 0.0)
        self.assertIsNone(distance_score(15.1, 15))
        self.assertEqual(distance_score(5, 5), 0.0)
        self.assertIsNone(distance_score(5.1, 5))


class TestEvaluateCandidateMatchEndToEnd(unittest.TestCase):
    """Test evaluate_candidate_match against docs/AI_MATCHING.md test matrix."""

    def setUp(self):
        self.now = datetime.now(timezone.utc)

    def test_tc_mat_01_same_location(self):
        """TC-MAT-01: Provider & Recipient at exact same coordinates (d = 0.0 km)."""
        result = evaluate_candidate_match(
            distance_km=0.0,
            recipient_max_travel_distance_km=15.0,
            quantity_meals=50,
            daily_capacity_meals=100,
            expiry_time=self.now + timedelta(hours=1),
            current_time=self.now,
            food_type="VEGETARIAN_COOKED",
            dietary_preference="ALL",
            perishable=True,
            storage_types=["REFRIGERATED"],
        )
        self.assertTrue(result.is_qualified)
        self.assertEqual(result.total_score, 1.0)

    def test_tc_mat_02_exact_maximum_radius(self):
        """TC-MAT-02: Distance is exactly effective radius (15.0 km) -> S_dist = 0.00."""
        result = evaluate_candidate_match(
            distance_km=15.0,
            recipient_max_travel_distance_km=15.0,
            quantity_meals=50,
            daily_capacity_meals=100,
            expiry_time=self.now + timedelta(hours=1),
            current_time=self.now,
            food_type="VEGETARIAN_COOKED",
            dietary_preference="ALL",
            perishable=False,
            storage_types=["DRY"],
        )
        self.assertTrue(result.is_qualified)
        # dist: 0.00*0.35=0, urg: 1.0*0.30=0.30, cap: 1.0*0.20=0.20, req: 1.0*0.15=0.15 -> 0.65
        self.assertEqual(result.total_score, 0.65)

    def test_tc_mat_03_outside_radius(self):
        """TC-MAT-03: Distance exceeds effective radius -> Hard-Disqualified."""
        result = evaluate_candidate_match(
            distance_km=15.1,
            recipient_max_travel_distance_km=15.0,
            quantity_meals=50,
            daily_capacity_meals=100,
            expiry_time=self.now + timedelta(hours=1),
            current_time=self.now,
            food_type="VEGETARIAN_COOKED",
            dietary_preference="ALL",
            perishable=False,
            storage_types=["DRY"],
        )
        self.assertFalse(result.is_qualified)
        self.assertEqual(result.total_score, 0.0)
        self.assertIn("travel radius", result.disqualification_reason)

    def test_tc_mat_04_expired_or_too_soon(self):
        """TC-MAT-04: Expiry time < 30 mins remaining -> Disqualified."""
        result = evaluate_candidate_match(
            distance_km=2.0,
            recipient_max_travel_distance_km=15.0,
            quantity_meals=50,
            daily_capacity_meals=100,
            expiry_time=self.now + timedelta(minutes=20),
            current_time=self.now,
            food_type="VEGETARIAN_COOKED",
            dietary_preference="ALL",
            perishable=False,
            storage_types=["DRY"],
        )
        self.assertFalse(result.is_qualified)
        self.assertEqual(result.total_score, 0.0)
        self.assertIn("30 minutes", result.disqualification_reason)

    def test_tc_mat_05_incompatible_dietary(self):
        """TC-MAT-05: Non-veg food with VEGETARIAN_ONLY recipient -> Hard-Disqualified."""
        result = evaluate_candidate_match(
            distance_km=2.0,
            recipient_max_travel_distance_km=15.0,
            quantity_meals=50,
            daily_capacity_meals=100,
            expiry_time=self.now + timedelta(hours=1),
            current_time=self.now,
            food_type="NON_VEGETARIAN_COOKED",
            dietary_preference="VEGETARIAN_ONLY",
            perishable=False,
            storage_types=["DRY"],
        )
        self.assertFalse(result.is_qualified)
        self.assertEqual(result.total_score, 0.0)
        self.assertIn("Dietary mismatch", result.disqualification_reason)

    def test_tc_mat_06_capacity_overrun(self):
        """TC-MAT-06: 200 meals for 100 capacity -> S_cap = 0.00, qualified with penalized score."""
        result = evaluate_candidate_match(
            distance_km=0.0,
            recipient_max_travel_distance_km=15.0,
            quantity_meals=200,
            daily_capacity_meals=100,
            expiry_time=self.now + timedelta(hours=1),
            current_time=self.now,
            food_type="VEGETARIAN_COOKED",
            dietary_preference="ALL",
            perishable=False,
            storage_types=["DRY"],
        )
        self.assertTrue(result.is_qualified)
        # dist: 1.0*0.35=0.35, urg: 1.0*0.30=0.30, cap: 0.0*0.20=0.0, req: 1.0*0.15=0.15 -> 0.80
        self.assertEqual(result.total_score, 0.80)

    def test_tc_mat_09_storage_incompatible(self):
        """TC-MAT-09: Perishable donation with DRY storage only -> Hard-Disqualified."""
        result = evaluate_candidate_match(
            distance_km=2.0,
            recipient_max_travel_distance_km=15.0,
            quantity_meals=50,
            daily_capacity_meals=100,
            expiry_time=self.now + timedelta(hours=1),
            current_time=self.now,
            food_type="VEGETARIAN_COOKED",
            dietary_preference="ALL",
            perishable=True,
            storage_types=["DRY"],
        )
        self.assertFalse(result.is_qualified)
        self.assertEqual(result.total_score, 0.0)
        self.assertIn("Storage mismatch", result.disqualification_reason)


if __name__ == "__main__":
    unittest.main()

--
-- PostgreSQL database dump
--

\restrict 5PTX2aJcXoCxLLSJKnwmCd9WqE64EMJys0wIgFms3BL0eBYYEEKbOod9Xx53X3u

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-10-12 19:24:08

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 32769)
-- Name: donations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.donations (
    id bigint NOT NULL,
    provider_id bigint NOT NULL,
    food_type character varying(100) NOT NULL,
    quantity_meals integer NOT NULL,
    storage_requirement character varying(50) NOT NULL,
    expiry_at timestamp with time zone NOT NULL,
    status character varying(20) DEFAULT 'AVAILABLE'::character varying NOT NULL,
    latitude numeric(9,6),
    longitude numeric(9,6),
    pickup_address text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT donations_quantity_meals_check CHECK ((quantity_meals > 0)),
    CONSTRAINT donations_status_check CHECK (((status)::text = ANY ((ARRAY['AVAILABLE'::character varying, 'RESERVED'::character varying, 'COMPLETED'::character varying, 'EXPIRED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.donations OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 32768)
-- Name: donations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.donations ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.donations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 224 (class 1259 OID 32796)
-- Name: matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.matches (
    id bigint NOT NULL,
    donation_id bigint NOT NULL,
    recipient_id bigint NOT NULL,
    score numeric(5,4) NOT NULL,
    status character varying(20) DEFAULT 'PROPOSED'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT matches_score_check CHECK (((score >= (0)::numeric) AND (score <= (1)::numeric))),
    CONSTRAINT matches_status_check CHECK (((status)::text = ANY ((ARRAY['PROPOSED'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying])::text[])))
);


ALTER TABLE public.matches OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 32795)
-- Name: matches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.matches ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.matches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 226 (class 1259 OID 32824)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    match_id bigint,
    type character varying(50) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 32823)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 220 (class 1259 OID 24579)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['PROVIDER'::character varying, 'RECIPIENT'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 24578)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 5051 (class 0 OID 32769)
-- Dependencies: 222
-- Data for Name: donations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.donations (id, provider_id, food_type, quantity_meals, storage_requirement, expiry_at, status, latitude, longitude, pickup_address, created_at, updated_at) FROM stdin;
1	1	Cooked Rice Meals	50	ROOM_TEMPERATURE	2026-10-07 13:41:19.787304+05:30	AVAILABLE	17.659900	75.906400	Test Pickup Address	2026-10-06 13:41:19.787304+05:30	2026-10-06 13:41:19.787304+05:30
\.


--
-- TOC entry 5053 (class 0 OID 32796)
-- Dependencies: 224
-- Data for Name: matches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.matches (id, donation_id, recipient_id, score, status, created_at, updated_at) FROM stdin;
1	1	2	0.9000	PROPOSED	2026-10-06 14:02:59.15539+05:30	2026-10-06 14:02:59.15539+05:30
\.


--
-- TOC entry 5055 (class 0 OID 32824)
-- Dependencies: 226
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, match_id, type, message, is_read, created_at) FROM stdin;
\.


--
-- TOC entry 5049 (class 0 OID 24579)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password_hash, role, created_at, updated_at) FROM stdin;
3	Provider ishan	ishan@gmail.com	demo_propassword	PROVIDER	2026-10-12 15:21:16.414996+05:30	2026-10-12 15:21:16.414996+05:30
4	Recipient Eshwari	eshwari@gmail.com	demo_password	RECIPIENT	2026-10-12 15:21:16.414996+05:30	2026-10-12 15:21:16.414996+05:30
1	swati	swati23@gmail.com	TEST_HASH_ONLY	PROVIDER	2026-10-06 13:30:28.290261+05:30	2026-10-12 15:30:01.616086+05:30
2	Nikhil	Nikhi453@gmail.com	TEST_HASH_ONLY	RECIPIENT	2026-10-06 13:38:02.96315+05:30	2026-10-12 15:31:37.864522+05:30
\.


--
-- TOC entry 5061 (class 0 OID 0)
-- Dependencies: 221
-- Name: donations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.donations_id_seq', 1, true);


--
-- TOC entry 5062 (class 0 OID 0)
-- Dependencies: 223
-- Name: matches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.matches_id_seq', 1, true);


--
-- TOC entry 5063 (class 0 OID 0)
-- Dependencies: 225
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- TOC entry 5064 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- TOC entry 4891 (class 2606 OID 32789)
-- Name: donations donations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_pkey PRIMARY KEY (id);


--
-- TOC entry 4893 (class 2606 OID 32812)
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- TOC entry 4895 (class 2606 OID 32838)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4887 (class 2606 OID 24597)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4889 (class 2606 OID 24595)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4896 (class 2606 OID 32790)
-- Name: donations fk_donation_provider; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT fk_donation_provider FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- TOC entry 4897 (class 2606 OID 32813)
-- Name: matches fk_match_donation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT fk_match_donation FOREIGN KEY (donation_id) REFERENCES public.donations(id);


--
-- TOC entry 4898 (class 2606 OID 32818)
-- Name: matches fk_match_recipient; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT fk_match_recipient FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- TOC entry 4899 (class 2606 OID 32844)
-- Name: notifications fk_notification_match; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notification_match FOREIGN KEY (match_id) REFERENCES public.matches(id);


--
-- TOC entry 4900 (class 2606 OID 32839)
-- Name: notifications fk_notification_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES public.users(id);


-- Completed on 2026-10-12 19:24:09

--
-- PostgreSQL database dump complete
--

\unrestrict 5PTX2aJcXoCxLLSJKnwmCd9WqE64EMJys0wIgFms3BL0eBYYEEKbOod9Xx53X3u


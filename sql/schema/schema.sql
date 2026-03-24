CREATE SCHEMA IF NOT EXISTS pu_morning_briefings;
create table pu_morning_briefings.users (
    id serial primary key,
    email varchar(255) not null unique constraint email_format check ((email)::text ~~ '%@un.org'::text),
    password_hash varchar(255) not null,
    first_name varchar(100) not null,
    last_name varchar(100) not null,
    team varchar(100) not null,
    email_verified boolean default false,
    verification_token varchar(255),
    verification_token_expires timestamp,
    created_at timestamp default CURRENT_TIMESTAMP,
    updated_at timestamp default CURRENT_TIMESTAMP
);
create table pu_morning_briefings.entries (
    id text not null primary key,
    category text not null,
    priority text not null,
    region text not null,
    country text not null,
    headline text not null,
    date timestamp(3) not null,
    entry text not null,
    source_url text,
    pu_note text,
    status text,
    approval_status text default 'pending'::text,
    ai_summary json,
    source_date date,
    source_name text,
    comment text,
    author_id integer references pu_morning_briefings.users on delete
    set null,
        previous_entry_id text references pu_morning_briefings.entries on delete
    set null,
        thematic text
);
create index idx_entries_approval_status on pu_morning_briefings.entries (approval_status);
create index idx_entries_ai_summary on pu_morning_briefings.entries (id)
where (ai_summary IS NOT NULL);
create index idx_entries_source_date on pu_morning_briefings.entries (source_date);
create index idx_entries_author_id on pu_morning_briefings.entries (author_id);
create index idx_entries_status_author_id on pu_morning_briefings.entries (status, author_id);
create index idx_entries_previous_entry_id on pu_morning_briefings.entries (previous_entry_id);
create table pu_morning_briefings.images (
    id text not null primary key,
    entry_id text not null constraint fk_images_entry_id references pu_morning_briefings.entries on update cascade on delete cascade,
    filename text not null,
    mime_type text not null,
    blob_url text not null,
    width integer,
    height integer,
    position integer,
    created_at timestamp(3) default CURRENT_TIMESTAMP not null
);
create index idx_users_email on pu_morning_briefings.users (email);
create index idx_users_verification_token on pu_morning_briefings.users (verification_token);
create trigger update_users_updated_at before
update on pu_morning_briefings.users for each row execute procedure pu_morning_briefings.update_updated_at_column();
create table pu_morning_briefings.user_whitelist (
    id serial primary key,
    email text not null unique,
    user_id integer references pu_morning_briefings.users on delete
    set null,
        added_by integer references pu_morning_briefings.users on delete
    set null,
        created_at timestamp with time zone default CURRENT_TIMESTAMP
);
comment on table pu_morning_briefings.user_whitelist is 'Stores pre-approved email addresses allowed to register for the platform';
create index idx_whitelist_email on pu_morning_briefings.user_whitelist (email);
create table pu_morning_briefings.password_resets (
    id serial primary key,
    user_id integer not null references pu_morning_briefings.users on delete cascade,
    token_hash varchar(255) not null unique,
    expires_at timestamp not null,
    created_at timestamp default CURRENT_TIMESTAMP,
    used_at timestamp,
    ip_address varchar(45)
);
comment on table pu_morning_briefings.password_resets is 'Stores secure password reset tokens with expiration';
comment on column pu_morning_briefings.password_resets.token_hash is 'Bcrypt hash of the reset token for security';
comment on column pu_morning_briefings.password_resets.expires_at is 'Token expiration time (typically 15-30 minutes)';
comment on column pu_morning_briefings.password_resets.used_at is 'Timestamp when token was used (null if unused)';
create index idx_password_resets_token on pu_morning_briefings.password_resets (token_hash);
create index idx_password_resets_user_id on pu_morning_briefings.password_resets (user_id);
create index idx_password_resets_expires on pu_morning_briefings.password_resets (expires_at);
create index idx_password_resets_used_at on pu_morning_briefings.password_resets (used_at);
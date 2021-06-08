create table accounts
(
    acc_id             bigint unsigned                      not null
        primary key,
    acc_access         varchar(1536)                        not null,
    acc_refresh        varchar(1536)                        not null,
    acc_token_expiry   int                                  not null,
    acc_token_registry datetime default current_timestamp() not null
);

create table pages
(
    pge_id        char(40)       not null
        primary key,
    pge_wiki      varchar(16)    not null,
    pge_namespace int            not null,
    pge_page      varbinary(255) not null,
    constraint ux_pge_title
        unique (pge_wiki, pge_namespace, pge_page)
);

create table sessions
(
    ses_id      char(64)        not null
        primary key,
    ses_account bigint unsigned not null,
    ses_expiry  datetime        not null,
    constraint fk_ses_account
        foreign key (ses_account) references accounts (acc_id)
            on update cascade on delete cascade
);

create table watchlists_user
(
    wtl_id            bigint unsigned not null
        primary key,
    wtl_account       bigint unsigned not null,
    wtl_wiki          varchar(16)     not null,
    wtl_interval      int             not null,
    wtl_update        datetime        not null,
    wtl_update_manual datetime        not null,
    wtl_hash          binary(16)      not null,
    constraint fk_wtl_account
        foreign key (wtl_account) references accounts (acc_id)
            on update cascade on delete cascade
);

create table pages_userwatchlists
(
    pwl_id        bigint unsigned auto_increment
        primary key,
    pwl_page      char(40)        not null,
    pwl_watchlist bigint unsigned not null,
    constraint ux_pwl_watchlist
        unique (pwl_page, pwl_watchlist),
    constraint fk_pwl_page
        foreign key (pwl_page) references pages (pge_id)
            on update cascade on delete cascade,
    constraint fk_pwl_watchlist
        foreign key (pwl_watchlist) references watchlists_user (wtl_id)
            on update cascade on delete cascade
);

create table webhooks
(
    whk_id      bigint unsigned          not null
        primary key,
    whk_account bigint unsigned          not null,
    whk_url     varchar(2048)            not null,
    whk_format  text collate utf8mb4_bin not null,
    constraint fk_whk_account
        foreign key (whk_account) references accounts (acc_id)
            on update cascade on delete cascade
);

create table routes
(
    rte_id      bigint unsigned     not null
        primary key,
    rte_wiki    varchar(16)         not null,
    rte_type    tinyint(4) unsigned not null,
    rte_webhook bigint unsigned     not null,
    constraint fk_rte_webhook
        foreign key (rte_webhook) references webhooks (whk_id)
            on update cascade on delete cascade
);


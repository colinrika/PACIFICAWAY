with source_cities as (
  select * from (values
    ('US', 'California', 'CA', 'Los Angeles'),
    ('US', 'California', 'CA', 'San Francisco'),
    ('US', 'New York', 'NY', 'New York City'),
    ('US', 'Texas', 'TX', 'Austin'),
    ('US', 'Washington', 'WA', 'Seattle'),
    ('CA', 'Ontario', 'ON', 'Toronto'),
    ('CA', 'British Columbia', 'BC', 'Vancouver'),
    ('AU', 'New South Wales', 'NSW', 'Sydney'),
    ('AU', 'Victoria', 'VIC', 'Melbourne'),
    ('PH', 'Metro Manila', 'NCR', 'Quezon City'),
    ('PH', 'Cebu', 'CEB', 'Cebu City'),
    ('GB', 'England', 'ENG', 'London'),
    ('GB', 'Scotland', 'SCT', 'Edinburgh'),
    ('IN', 'Maharashtra', 'MH', 'Mumbai'),
    ('IN', 'Karnataka', 'KA', 'Bengaluru'),
    ('NG', 'Lagos', 'LA', 'Lagos'),
    ('NG', 'Federal Capital Territory', 'FCT', 'Abuja'),
    ('ZA', 'Gauteng', 'GT', 'Johannesburg'),
    ('JP', null, null, 'Tokyo'),
    ('JP', null, null, 'Osaka'),
    ('SG', null, null, 'Singapore'),
    ('AE', null, null, 'Dubai'),
    ('AE', null, null, 'Abu Dhabi'),
    ('FR', null, null, 'Paris'),
    ('DE', null, null, 'Berlin'),
    ('BR', 'São Paulo', 'SP', 'São Paulo'),
    ('BR', 'Rio de Janeiro', 'RJ', 'Rio de Janeiro')
  ) as c(country_iso_code, state_name, state_code, city_name)
), resolved_cities as (
  select
    ctry.id as country_id,
    ctry.iso_code,
    trim(sc.city_name) as city_name,
    (
      select st.id
      from states st
      where st.country_id = ctry.id
        and (
          (sc.state_code is not null and sc.state_code <> '' and upper(st.code) = upper(sc.state_code))
          or (
            (sc.state_code is null or sc.state_code = '')
            and sc.state_name is not null
            and sc.state_name <> ''
            and lower(st.name) = lower(sc.state_name)
          )
        )
      limit 1
    ) as state_id
  from source_cities sc
  join countries ctry on upper(ctry.iso_code) = upper(sc.country_iso_code)
  where sc.city_name is not null and trim(sc.city_name) <> ''
)
insert into cities (country_id, state_id, name)
select country_id, state_id, city_name
from resolved_cities
on conflict (country_id, state_lookup, name)
do update set updated_at = now();

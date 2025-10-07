with source_states as (
  select * from (values
    ('US', 'California', 'CA'),
    ('US', 'New York', 'NY'),
    ('US', 'Texas', 'TX'),
    ('US', 'Washington', 'WA'),
    ('CA', 'Ontario', 'ON'),
    ('CA', 'Quebec', 'QC'),
    ('CA', 'British Columbia', 'BC'),
    ('AU', 'New South Wales', 'NSW'),
    ('AU', 'Victoria', 'VIC'),
    ('PH', 'Metro Manila', 'NCR'),
    ('PH', 'Cebu', 'CEB'),
    ('GB', 'England', 'ENG'),
    ('GB', 'Scotland', 'SCT'),
    ('IN', 'Maharashtra', 'MH'),
    ('IN', 'Karnataka', 'KA'),
    ('NG', 'Lagos', 'LA'),
    ('NG', 'Federal Capital Territory', 'FCT'),
    ('ZA', 'Gauteng', 'GT'),
    ('BR', 'São Paulo', 'SP'),
    ('BR', 'Rio de Janeiro', 'RJ')
  ) as s(country_iso_code, state_name, state_code)
)
insert into states (country_id, name, code)
select c.id, s.state_name, nullif(s.state_code, '')
from source_states s
join countries c on upper(c.iso_code) = upper(s.country_iso_code)
on conflict (country_id, name)
do update set code = excluded.code, updated_at = now();

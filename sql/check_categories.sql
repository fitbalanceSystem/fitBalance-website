-- ראי אילו קטגוריות קיימות כרגע במוצרים
select distinct category, count(*) as products_count
from products
where category is not null
group by category
order by category;

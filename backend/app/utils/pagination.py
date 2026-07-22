from flask import request


def paginate(query, default_per_page=20, max_per_page=100):
    try:
        page = max(1, int(request.args.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        per_page = int(request.args.get("per_page", default_per_page))
    except (TypeError, ValueError):
        per_page = default_per_page
    per_page = max(1, min(per_page, max_per_page))

    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    pages = (total + per_page - 1) // per_page if per_page else 0

    return {
        "items": items,
        "page": page,
        "per_page": per_page,
        "total": total,
        "pages": pages,
    }


def paginate_list(items_list, default_per_page=20, max_per_page=100):
    try:
        page = max(1, int(request.args.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        per_page = int(request.args.get("per_page", default_per_page))
    except (TypeError, ValueError):
        per_page = default_per_page
    per_page = max(1, min(per_page, max_per_page))

    total = len(items_list)
    start = (page - 1) * per_page
    items = items_list[start : start + per_page]
    pages = (total + per_page - 1) // per_page if per_page else 0

    return {
        "items": items,
        "page": page,
        "per_page": per_page,
        "total": total,
        "pages": pages,
    }

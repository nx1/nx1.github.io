import bisect

#def bisect(a, x, lo=0, hi=None):
#    """
#    a = [1,3,5,7]
#    x = 4
#
#    x moves between 3 and 5 which corresponds to position i=3
#    and so the function will return 3
#
#    this function only works if the a is already sorted,
#    there is no check for this
#    """
#    if lo < 0:
#        raise ValueError('lo must be non-negative')
#    if hi is None:
#        hi = len(a)
#    while lo < hi:
#        mid = (lo+hi)//2    # integer division aka floor()
#        if a[mid] < x:
#            lo = mid + 1
#        else:
#            hi = mid
#    return lo

def smaller_counts(lst):
    result = []
    seen = []

    for num in reversed(lst):
        i = bisect.bisect_left(seen,num)
        result.append(i)
        bisect.insort(seen,num)

    return list(reversed(result))


if __name__ == "__main__":
    arr = [3,4,7,6,1]
    print(smaller_counts(arr))


def window(array):
    """
    This solution runs in O[n*log(n)] time and space 
    since a sorted copy of the original array is created.
    """
    left, right = None, None
    for i in range(len(array)):
        if array[i] != s[i] and left is None:
            left = i
        elif array[i] != s[i]:
            right = i
    return left, right

def window2(array):
    """
    This solution goes over the array twice, first forwards
    then backwards, checking to see if the current value is less
    than previously seen values when going from left to right
    and then checking if higher than minimum seen values when going
    from right to left.

    This solution is therefore slightly faster as you only go over the array
    twice and don't have to sort it.
    """
    left, right = None, None
    n = len(array)
    max_seen, min_seen = -float("inf"), float("inf")

    for i in range(n):
        max_seen = max(max_seen, array[i])
        if array[i] < max_seen:
            right = i

    for i in range(n-1,-1,-1):
        min_seen = min(min_seen, array[i])
        if array[i] > min_seen:
            left = i
    return left, right


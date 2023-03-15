arr      = [1,2,3,4,5]
products = [0,0,0,0,0]

for i in range(len(arr)):
    product = 1
    for j in range(len(arr)):
        if i==j:
            continue
        value = arr[j]
        product = product * value
    products[i] = product
print(products)

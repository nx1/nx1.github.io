#include <stdio.h>

int main(){
    int arr[5] = {1,2,3,4,5};
    int products[5];

    int val;
    int product;

    for(int i=0;i<5;i++){
        product = 1;
        for(int j=0;j<5;j++){
            if (i==j){
                continue;
            }
            val = arr[j];
            product = product * val;
        products[i] = product;
        }
    }


    for(int i=0;i<5;i++){
        printf("%d \n",products[i]);
    }
    return 0;
}

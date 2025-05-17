class Bicycle:
    def __init__(self, size, chain=None, tire_size=None, **kwargs):
        self.size      = size
        self.chain     = chain 
        self.tire_size = tire_size 

    def spares(self):
        return {'chain'     : self.chain,
                'tire_size' : self.size}

class RoadBike(Bicycle):
    def __init__(self, **kwargs):
        self.chain      = '10-speed'
        self.tire_size  = '23'
        super().__init__(**kwargs)
        self.tape_color = kwargs['tape_color']

    def spares(self):
        s = super().spares()
        s['tape_color'] = self.tape_color
        return s

class MountainBike(Bicycle):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.front_shock = kwargs['front_shock']
        self.rear_shock  = kwargs['rear_shock']
        self.chain       = ''

    def spares(self):
        s = super().spares()
        s['front_shock'] = self.front_shock
        s['rear_shock']  = self.rear_shock
        return s

b1 = RoadBike(size='M', tape_color='red')
b2 = MountainBike(size='L', front_shock='Manitou', rear_shock='Fox')
print(b1.spares())
print(b2.spares())
